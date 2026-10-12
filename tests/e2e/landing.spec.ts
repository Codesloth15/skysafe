import { test, expect } from '@playwright/test';
test('landing introduces SkySafe and opens the drone workspace', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'A better flight',
  );
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Landing navigation' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/' + testInfo.project.name + '-landing.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('link', { name: 'Open Airspace Map', exact: true })
    .click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.reload();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'A better flight',
  );
  await page
    .getByRole('link', { name: 'Check a location', exact: true })
    .click();
  await expect(page).toHaveURL(/\/checker$/);
  await expect(page.locator('.leaflet-container')).toBeVisible();
  expect(errors).toEqual([]);
});
