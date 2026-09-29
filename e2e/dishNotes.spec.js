import { test, expect } from '@playwright/test';

// Registers a fresh throwaway user and waits for the shell to load (same
// pattern as e2e/auth.spec.js / e2e/favouriteSpace.spec.js).
async function register(page, username) {
  await page.goto('/');
  await page.getByText('New here? Create an account').click();
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.locator('.space-switch select option')).toHaveCount(1);
}

async function openDishesTab(page) {
  await page.getByRole('button', { name: 'Dishes' }).click();
  await expect(page.getByRole('heading', { name: 'Dishes' })).toBeVisible();
}

test.describe('dish notes', () => {
  test('creating a dish with notes shows the note in the edit form, including after reload', async ({ page }) => {
    const username = `e2e-notes-${Date.now()}`;
    await register(page, username);
    await openDishesTab(page);

    await page.getByRole('button', { name: 'Add dish' }).click();
    await page.getByPlaceholder('e.g. Pasta Pesto').fill('Lasagna');
    await page.getByPlaceholder('Any notes about this dish…').fill('Double the garlic next time');
    await page.getByRole('button', { name: 'Save' }).click();

    // Sheet closes and the dish shows up in the list (notes are not shown on
    // the card itself, by design -- only in the edit form).
    await expect(page.getByRole('heading', { name: 'Lasagna' })).toBeVisible();

    // Reopen for editing: the note we saved should be there.
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByPlaceholder('Any notes about this dish…')).toHaveValue('Double the garlic next time');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Reload the whole app and confirm the note persisted server-side.
    await page.reload();
    await openDishesTab(page);
    await expect(page.getByRole('heading', { name: 'Lasagna' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByPlaceholder('Any notes about this dish…')).toHaveValue('Double the garlic next time');
  });

  test('editing a dish to change its note persists the new value without touching other fields', async ({ page }) => {
    const username = `e2e-notes-edit-${Date.now()}`;
    await register(page, username);
    await openDishesTab(page);

    await page.getByRole('button', { name: 'Add dish' }).click();
    await page.getByPlaceholder('e.g. Pasta Pesto').fill('Tacos');
    // getByPlaceholder('Ingredient') is a substring match and also hits the
    // "Search name or ingredient…" filter box (see AGENTS.md §8 gotchas) —
    // scope to the ingredient row instead.
    await page.locator('.ing-row').nth(0).locator('.ing-name').fill('Tortilla');
    await page.locator('.ing-row').nth(0).locator('.ing-amt').fill('8');
    await page.getByPlaceholder('quick, veggie').fill('mexican');
    await page.getByPlaceholder('Any notes about this dish…').fill('Original note');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Tacos' })).toBeVisible();

    // Edit: change only the note, leave name/ingredients/tags untouched.
    await page.getByRole('button', { name: 'Edit' }).click();
    const notesField = page.getByPlaceholder('Any notes about this dish…');
    await expect(notesField).toHaveValue('Original note');
    await notesField.fill('Updated note: use corn tortillas');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Tacos' })).toBeVisible();

    // Reload and verify: name, ingredient, tag, and the new note all persisted.
    await page.reload();
    await openDishesTab(page);
    await expect(page.getByRole('heading', { name: 'Tacos' })).toBeVisible();
    // "mexican" also appears in the filter-bar tag toggles, so scope to the
    // dish card itself.
    const tacoCard = page.locator('.dish-card', { has: page.getByRole('heading', { name: 'Tacos' }) });
    await expect(tacoCard.getByText('mexican')).toBeVisible();
    await expect(tacoCard.getByText('Tortilla')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('.ing-row').nth(0).locator('.ing-name')).toHaveValue('Tortilla');
    await expect(page.getByPlaceholder('Any notes about this dish…')).toHaveValue('Updated note: use corn tortillas');
  });

  test('editing a dish without touching the notes field preserves the existing note', async ({ page }) => {
    const username = `e2e-notes-preserve-${Date.now()}`;
    await register(page, username);
    await openDishesTab(page);

    await page.getByRole('button', { name: 'Add dish' }).click();
    await page.getByPlaceholder('e.g. Pasta Pesto').fill('Soup');
    await page.getByPlaceholder('Any notes about this dish…').fill('Simmer for an hour');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Soup' })).toBeVisible();

    // Edit only the name; leave the note field as-is (pre-filled by openEdit).
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByPlaceholder('Any notes about this dish…')).toHaveValue('Simmer for an hour');
    await page.getByPlaceholder('e.g. Pasta Pesto').fill('Hearty Soup');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Hearty Soup' })).toBeVisible();

    await page.reload();
    await openDishesTab(page);
    await expect(page.getByRole('heading', { name: 'Hearty Soup' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByPlaceholder('Any notes about this dish…')).toHaveValue('Simmer for an hour');
  });
});
