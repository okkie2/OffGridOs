import { expect, test } from '@playwright/test';

const canonicalWorkbenchRoutes = [
  {
    path: '/en/18mad/production',
    locator: { role: 'heading', name: 'Yield overview' },
  },
  {
    path: '/en/18mad/battery-array',
    locator: { role: 'heading', name: 'Battery bank details' },
  },
  {
    path: '/en/18mad/consumption',
    locator: { role: 'heading', name: 'Consumption' },
  },
  {
    path: '/en/18mad/consumption/converters',
    locator: { role: 'heading', name: 'Converters' },
  },
  {
    path: '/en/18mad/load-circuits',
    locator: { role: 'button', name: 'Add load circuit' },
  },
  {
    path: '/en/18mad/loads',
    locator: { role: 'button', name: 'Add load' },
  },
] as const;

test('canonical workbench routes survive startup and reload', async ({ page }) => {
  for (const route of canonicalWorkbenchRoutes) {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole(route.locator.role, { name: route.locator.name }).first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole(route.locator.role, { name: route.locator.name }).first()).toBeVisible();
  }
});
