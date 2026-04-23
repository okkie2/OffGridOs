import { expect, test } from '@playwright/test';

test('inverter title survives save and full page refresh', async ({ page }) => {
  const title = `Playwright inverter title ${Date.now()}`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Inverter array' }).click();

  const titleInput = page.getByLabel('Title').first();
  const aboutPanel = titleInput.locator('xpath=ancestor::section[1]');
  await titleInput.fill(title);
  await aboutPanel.getByRole('button', { name: 'Save' }).click();

  await expect(titleInput).toHaveValue(title);

  await page.reload();

  await expect(page.getByLabel('Title').first()).toHaveValue(title);
});
