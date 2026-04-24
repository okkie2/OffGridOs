import { expect, test, type Page } from '@playwright/test';

async function hasPageOverflow(page: Page) {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return html.scrollWidth > html.clientWidth || body.scrollWidth > body.clientWidth;
  });
}

test('core pages do not overflow on mobile widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const routes = [
    '/en/project',
    '/en/project/solar-yield',
    '/en/project/battery-array',
    '/en/project/inverter-array',
    '/en/project/catalogs',
    '/en/project/catalogs/panel-types',
    '/en/project/catalogs/mppt-types',
    '/en/project/catalogs/battery-types',
    '/en/project/catalogs/inverter-types',
    '/en/project/reports',
    '/en/project/reports/verdict-summary',
    '/en/project/reports/cost-summary',
    '/en/project/about',
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(await hasPageOverflow(page)).toBe(false);
  }
});

test('surface detail remains mobile-safe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/en/project');
  const detailButtons = page.getByRole('button', { name: 'Detail' });
  const surfaceCount = await detailButtons.count();

  for (let index = 0; index < surfaceCount; index += 1) {
    await page.goto('/en/project');
    await page.getByRole('button', { name: 'Detail' }).nth(index).click();
    await expect(await hasPageOverflow(page)).toBe(false);
  }
});

test('breadcrumbs navigate back on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/en/project');
  await page.getByRole('button', { name: 'Detail' }).first().click();
  await page.getByRole('link', { name: 'Project' }).click();

  await expect(page).toHaveURL(/\/en\/18mad$/);
  await expect(await hasPageOverflow(page)).toBe(false);
});
