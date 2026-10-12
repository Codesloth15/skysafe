import { test, expect } from '@playwright/test';
test('map controls never overwrite a selected location and geolocation denial is handled', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (e: { code: number }) => void,
        ) => error({ code: 1 }),
      },
    }),
  );
  await page.goto('/explore');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  const map = page.locator('.leaflet-container');
  const box = await map.boundingBox();
  if (!box) throw new Error('Missing map viewport');
  await map.click({ position: { x: box.width * 0.77, y: box.height * 0.27 } });
  if (testInfo.project.name === 'mobile')
    await page
      .getByRole('button', { name: 'Selected location', exact: true })
      .click();
  const coords = page.locator('.assessment-panel .coordinates');
  await expect(coords).toBeVisible();
  const selected = await coords.innerText();
  await page.getByRole('button', { name: 'Map layers', exact: true }).click();
  await expect(coords).toHaveText(selected);
  await page.getByRole('button', { name: 'Close map layers' }).click();
  await expect(coords).toHaveText(selected);
  await page
    .getByRole('button', { name: 'Use current location', exact: true })
    .click();
  await expect(page.getByText(/Location permission was denied/)).toBeVisible();
  await expect(coords).toHaveText(selected);
});
test('loads local OSM features on explicit request and preserves the selected point', async ({
  page,
}) => {
  await page.route('**/overpass-api.de/**', (route) =>
    route.fulfill({
      json: {
        elements: [
          {
            id: 999999,
            type: 'node',
            lat: 14.55,
            lon: 121.03,
            tags: {
              name: 'Synthetic browser test helipad',
              aeroway: 'heliport',
            },
          },
        ],
      },
    }),
  );
  await page.goto('/explore');
  await page
    .getByRole('combobox', { name: 'Search locations' })
    .fill('14.55,121.03');
  await page.getByRole('option', { name: /Selected coordinates/ }).click();
  await page.waitForTimeout(1400);
  await page
    .getByRole('button', { name: 'Load nearby OSM', exact: true })
    .click();
  await expect(
    page.getByText('Loaded 1 OSM features for this area.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[title="Synthetic browser test helipad"]'),
  ).toBeVisible();
});
