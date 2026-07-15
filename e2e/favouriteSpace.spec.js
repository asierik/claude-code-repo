import { test, expect } from '@playwright/test';

// Registers a fresh throwaway user in `page` and waits for the shell to load.
async function register(page, username) {
  await page.goto('/');
  await page.getByText('New here? Create an account').click();
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  // Space list loads asynchronously after the shell mounts; wait for the
  // switcher to be populated (the user's own kitchen) before continuing.
  await expect(page.locator('.space-switch select option')).toHaveCount(1);
}

// Text of the currently-selected <option> in the space switcher.
function selectedSpaceName(page) {
  return page
    .locator('.space-switch select')
    .evaluate((el) => el.options[el.selectedIndex]?.textContent?.trim());
}

// Sets up two users where `member` has access to two spaces: the owner's
// kitchen (shared with them) and their own kitchen. Returns both pages plus
// the two space names, with `member`'s page left on the shell, freshly
// reloaded so it has picked up the shared space.
async function setupTwoSpaceMember(browser, stamp) {
  const ownerName = `e2e-fav-owner-${stamp}`;
  const memberName = `e2e-fav-member-${stamp}`;

  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await register(ownerPage, ownerName);

  const memberCtx = await browser.newContext();
  const memberPage = await memberCtx.newPage();
  await register(memberPage, memberName);

  // Owner shares their kitchen with member -> member now has 2 spaces.
  await ownerPage.getByTitle('Share this space').click();
  await ownerPage.getByPlaceholder('username').fill(memberName);
  await ownerPage.getByRole('button', { name: 'Share' }).click();
  await expect(ownerPage.getByText(`Shared with ${memberName}.`)).toBeVisible();
  await ownerPage.getByRole('button', { name: 'Close' }).click();

  // Member reloads to pick up the newly-accessible shared space.
  await memberPage.reload();
  await expect(memberPage.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(memberPage.locator('.space-switch select option')).toHaveCount(2);

  return {
    ownerCtx,
    memberCtx,
    ownerPage,
    memberPage,
    // Member's role in the owner's space is 'member', so the switcher labels
    // that option with a " (shared)" suffix (see shell.component.ts).
    ownerSpaceName: `${ownerName}'s kitchen (shared)`,
    memberSpaceName: `${memberName}'s kitchen`,
  };
}

test.describe('favourite space', () => {
  test('starring a space auto-selects it on reload; unstarring falls back to the first space', async ({
    browser,
  }) => {
    const { ownerCtx, memberCtx, memberPage, ownerSpaceName, memberSpaceName } =
      await setupTwoSpaceMember(browser, Date.now());

    // Nothing starred yet: falls back to the first space by id, which is the
    // owner's (older, lower-id) kitchen -- the previous default behavior.
    await expect.poll(() => selectedSpaceName(memberPage)).toBe(ownerSpaceName);

    const select = memberPage.locator('.space-switch select');

    // Switch to the member's own kitchen and star it.
    await select.selectOption({ label: memberSpaceName });
    const starBtn = memberPage.locator('.space-switch button.icon-btn').first();
    await expect(starBtn).toHaveText('☆');
    await expect(starBtn).toHaveAttribute('title', 'Set as favourite space');
    await starBtn.click();
    await expect(starBtn).toHaveText('★');
    await expect(starBtn).toHaveAttribute('title', 'Unset favourite space');

    // Reload: the favourited space (not the first one) is now auto-selected.
    await memberPage.reload();
    await expect(memberPage.getByRole('heading', { name: 'Calendar' })).toBeVisible();
    await expect.poll(() => selectedSpaceName(memberPage)).toBe(memberSpaceName);
    await expect(memberPage.locator('.space-switch button.icon-btn').first()).toHaveText('★');

    // Unstar the current favourite; after reload it falls back to the first
    // space again (previous default behavior).
    await memberPage.locator('.space-switch button.icon-btn').first().click();
    await expect(memberPage.locator('.space-switch button.icon-btn').first()).toHaveText('☆');

    await memberPage.reload();
    await expect(memberPage.getByRole('heading', { name: 'Calendar' })).toBeVisible();
    await expect.poll(() => selectedSpaceName(memberPage)).toBe(ownerSpaceName);

    await ownerCtx.close();
    await memberCtx.close();
  });

  test('starring a different space replaces the previous favourite (only one favourite at a time)', async ({
    browser,
  }) => {
    const { ownerCtx, memberCtx, memberPage, ownerSpaceName, memberSpaceName } =
      await setupTwoSpaceMember(browser, Date.now() + 1);

    const select = memberPage.locator('.space-switch select');
    const starBtn = memberPage.locator('.space-switch button.icon-btn').first();

    // Owner's kitchen is active by default (first in the list). Star it.
    await expect.poll(() => selectedSpaceName(memberPage)).toBe(ownerSpaceName);
    await expect(starBtn).toHaveText('☆');
    await starBtn.click();
    await expect(starBtn).toHaveText('★');

    // Switch to the member's own kitchen -- it's not the favourite yet.
    await select.selectOption({ label: memberSpaceName });
    await expect(starBtn).toHaveText('☆');

    // Star it too: this replaces the previous favourite (single-favourite model).
    await starBtn.click();
    await expect(starBtn).toHaveText('★');

    // Switching back to the owner's kitchen shows it's no longer favourited.
    await select.selectOption({ label: ownerSpaceName });
    await expect(starBtn).toHaveText('☆');
    await expect(starBtn).toHaveAttribute('title', 'Set as favourite space');

    // Reload confirms the replacement persisted server-side: the member's
    // own kitchen (the new favourite), not the owner's, is auto-selected.
    await memberPage.reload();
    await expect(memberPage.getByRole('heading', { name: 'Calendar' })).toBeVisible();
    await expect.poll(() => selectedSpaceName(memberPage)).toBe(memberSpaceName);

    await ownerCtx.close();
    await memberCtx.close();
  });
});
