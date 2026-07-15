import { test, expect } from '@playwright/test';

// Smoke test proving the e2e harness (webServer + browser + real DB) works end
// to end. Feature specs should follow this shape: register/login, then drive
// the feature through the UI.
test('register creates an account and lands on the calendar', async ({ page }) => {
  const username = `e2e-${Date.now()}`;

  await page.goto('/');
  await page.getByText('New here? Create an account').click();
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill('TestPass123!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('combobox')).toContainText(`${username}'s kitchen`);
});
