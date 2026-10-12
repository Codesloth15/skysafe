import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/photon.komoot.io/**', (route) =>
    route.fulfill({ json: { features: [] } }),
  );
});
test('searches coordinates, assesses conservatively, saves favorites and persists preferences', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/explore');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.aviation-marker').first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/' + testInfo.project.name + '-initial.png',
    fullPage: true,
  });
  await page
    .getByRole('combobox', { name: 'Search locations' })
    .fill('14.5086,121.0198');
  await page.getByRole('option', { name: /Selected coordinates/ }).click();
  if (testInfo.project.name === 'mobile')
    await page
      .getByRole('button', { name: 'Selected location', exact: true })
      .click();
  await expect(
    page.getByText('Not yet verified', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Airport proximity advisory', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText('Ninoy Aquino International Airport', { exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save this location' }).click();
  await page
    .getByLabel('Location name', { exact: true })
    .fill('Manila test point');
  await page
    .getByRole('button', { name: 'Save location', exact: true })
    .click();
  await page.goto('/saved');
  await expect(
    page.getByRole('heading', { name: 'Manila test point' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Manila test point' }),
  ).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await page.getByRole('button', { name: '10 km', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('button', { name: '10 km', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Map layers', exact: true }).click();
  await expect(page.getByLabel(/Verified prohibited zones/)).toBeDisabled();
  await expect(
    page.getByRole('button', { name: '10 km', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Close map layers' }).click();
  await page.screenshot({
    path: 'test-results/' + testInfo.project.name + '-map.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('missing airport and restriction files cannot result in flight permission', async ({
  page,
}, testInfo) => {
  await page.route('**/data/airports.json', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.route('**/data/restricted-zones.geojson', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('/explore');
  await page
    .getByRole('combobox', { name: 'Search locations' })
    .fill('17.6132,121.7270');
  await page.getByRole('option', { name: /Selected coordinates/ }).click();
  if (testInfo.project.name === 'mobile')
    await page
      .getByRole('button', { name: 'Selected location', exact: true })
      .click();
  await expect(
    page.getByText(/Data failures cannot establish permission/),
  ).toBeVisible();
  await expect(
    page.getByText('Not yet verified', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/safe to fly/i)).toHaveCount(0);
});
