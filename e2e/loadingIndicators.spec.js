import { test, expect } from '@playwright/test';

// Registers a fresh throwaway user and waits for the shell (Calendar tab,
// space switcher populated) to be ready, same as favouriteSpace.spec.js.
async function registerFreshUser(page, username) {
  await page.goto('/');
  await page.getByText('New here? Create an account').click();
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.locator('.space-switch select option')).toHaveCount(1);
}

// Delays responses matching `urlGlob` by `ms`, so a real (fast) localhost
// fetch stays in flight long enough to observe the loading UI. Only delays
// requests with the given HTTP method (default GET) so mutation requests
// (POST/DELETE) made against the same path aren't affected.
async function delayRoute(page, urlGlob, ms, method = 'GET') {
  await page.route(urlGlob, async (route) => {
    if (route.request().method() !== method) {
      return route.continue();
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

test.describe('loading indicators', () => {
  test('shows a full-page spinner during the initial session check, then the auth screen', async ({ page }) => {
    await delayRoute(page, '**/api/me', 600);

    await page.goto('/');

    await expect(page.locator('.spinner-page .spinner')).toBeVisible();
    // The auth screen must not render underneath/instead of the spinner while
    // the session check is still in flight.
    await expect(page.getByText('New here? Create an account')).toHaveCount(0);

    await expect(page.locator('.spinner-page')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText('New here? Create an account')).toBeVisible();
  });

  test('dishes tab shows skeleton rows before content, never the empty message while loading', async ({ page }) => {
    await registerFreshUser(page, `e2e-loading-dishes-${Date.now()}`);

    await delayRoute(page, '**/api/spaces/*/dishes', 600);
    await page.getByRole('button', { name: 'Dishes' }).click();

    // Skeleton cards render immediately (loading() starts true).
    await expect(page.locator('.dish-card .skeleton').first()).toBeVisible();
    await expect(page.getByText('No dishes yet', { exact: false })).toHaveCount(0);

    // Once the delayed fetch resolves, the skeleton is gone and — since there
    // really are no dishes yet — the empty message appears in its place.
    await expect(page.locator('.dish-card')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText('No dishes yet', { exact: false })).toBeVisible();
  });

  test('adding a dish updates the list without flashing the skeleton again', async ({ page }) => {
    await registerFreshUser(page, `e2e-loading-dishes-add-${Date.now()}`);
    await page.getByRole('button', { name: 'Dishes' }).click();
    await expect(page.getByText('No dishes yet', { exact: false })).toBeVisible();

    // Delay the post-save refetch so there's a window to check for a skeleton flash.
    await delayRoute(page, '**/api/spaces/*/dishes', 600);
    await page.getByRole('button', { name: 'Add dish' }).click();
    await page.getByPlaceholder('e.g. Pasta Pesto').fill('Test Pasta');
    await page.getByRole('button', { name: 'Save' }).click();

    // The mutation's silent refresh() must not fall back to the skeleton view.
    await expect(page.locator('.dish-card .skeleton')).toHaveCount(0);

    await expect(page.getByRole('heading', { name: 'Test Pasta', level: 3 })).toBeVisible({ timeout: 5000 });
  });

  test('grocery tab shows skeleton rows before content, never the empty message while loading', async ({ page }) => {
    await registerFreshUser(page, `e2e-loading-grocery-${Date.now()}`);

    await delayRoute(page, '**/api/spaces/*/grocery', 600);
    await page.getByRole('button', { name: 'Grocery' }).click();

    await expect(page.locator('.skel-checkbox').first()).toBeVisible();
    await expect(page.getByText('Nothing to buy yet', { exact: false })).toHaveCount(0);

    await expect(page.locator('.skel-checkbox')).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText('Nothing to buy yet', { exact: false })).toBeVisible();
  });

  test('toggling a grocery item updates in place without flashing the skeleton again', async ({ page }) => {
    await registerFreshUser(page, `e2e-loading-grocery-toggle-${Date.now()}`);
    await page.getByRole('button', { name: 'Grocery' }).click();
    await expect(page.getByText('Nothing to buy yet', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByPlaceholder('e.g. window cleaner').fill('Paper towels');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Paper towels')).toBeVisible();

    // Delay the post-toggle refetch so there's a window to check for a skeleton flash.
    await delayRoute(page, '**/api/spaces/*/grocery', 600);
    await page.getByText('Paper towels').click(); // clicking the label toggles the checkbox

    await expect(page.locator('.skel-checkbox')).toHaveCount(0);
    await expect(page.locator('.gitem.done')).toBeVisible({ timeout: 5000 });
  });

  test('assigning a dish to a calendar slot does not re-show the day skeletons', async ({ page }) => {
    await registerFreshUser(page, `e2e-loading-calendar-${Date.now()}`);

    // Need at least one dish to assign.
    await page.getByRole('button', { name: 'Dishes' }).click();
    await page.getByRole('button', { name: 'Add dish' }).click();
    await page.getByPlaceholder('e.g. Pasta Pesto').fill('Omelette');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Omelette', level: 3 })).toBeVisible();

    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();

    await delayRoute(page, '**/api/spaces/*/plan', 600);
    await page.locator('.card.day.today .slot', { hasText: 'dinner' }).click();
    await page.getByRole('button', { name: 'Omelette' }).click();

    // The post-assignment refetch (plan list) must not flash the day skeletons —
    // calendar mutations were already exempt from the loading() flag before this
    // feature, and this feature must not have changed that.
    await expect(page.locator('.slot.skeleton')).toHaveCount(0);

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.card.day.today .slot', { hasText: 'dinner' })).toContainText('Omelette', {
      timeout: 5000,
    });
  });

  test('share modal shows a spinner while members are loading, then the member list', async ({ page }) => {
    await registerFreshUser(page, `e2e-loading-members-${Date.now()}`);

    await delayRoute(page, '**/api/spaces/*/members', 600);
    await page.getByTitle('Share this space').click();

    await expect(page.locator('.spinner-row')).toBeVisible();
    await expect(page.locator('.spinner-row')).toContainText('Loading');

    await expect(page.locator('.spinner-row')).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('.member-row')).toBeVisible();
  });
});
