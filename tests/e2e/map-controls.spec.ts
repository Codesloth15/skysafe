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
}, testInfo) => {
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
          {
            id: 999998,
            type: 'node',
            lat: 14.551,
            lon: 121.031,
            tags: { name: 'Synthetic police station', amenity: 'police' },
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
  if (testInfo.project.name === 'mobile')
    await page
      .getByRole('button', { name: 'More map tools', exact: true })
      .click();
  await page
    .getByRole('button', { name: 'Load nearby OSM', exact: true })
    .click();
  await expect(
    page.getByText(
      'Loaded 1 airports and 1 sensitive establishments for this area.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.locator('[title="Synthetic browser test helipad"]'),
  ).toBeVisible();
  if (testInfo.project.name === 'mobile')
    await page
      .getByRole('button', { name: 'Selected location', exact: true })
      .click();
  await expect(
    page.getByRole('button', { name: 'Synthetic police station', exact: true }),
  ).toHaveCount(1);
  await expect(page.getByText('1 within 25 km', { exact: true })).toHaveCount(
    1,
  );
  await expect(page.getByText('Not yet verified', { exact: true })).toHaveCount(
    1,
  );
  await page
    .getByRole('button', { name: 'Synthetic police station', exact: true })
    .click();
  await expect(page.locator('.selected-location h3')).toHaveText(
    'Synthetic police station',
  );
  await expect(page.locator('.assessment-panel .coordinates')).toContainText(
    '14.55100',
  );
  await expect(page).toHaveURL(/\/explore$/);
  expect(page.context().pages()).toHaveLength(1);
  if (testInfo.project.name === 'mobile') {
    await expect(page.locator('.assessment-panel')).not.toHaveClass(/expanded/);
    await page
      .getByRole('button', { name: 'Selected location', exact: true })
      .click();
  }
  await page
    .locator('.nearby-list')
    .getByRole('button', {
      name: 'Synthetic browser test helipad',
      exact: true,
    })
    .click();
  await expect(page.locator('.selected-location h3')).toHaveText(
    'Synthetic browser test helipad',
  );
  await expect(page.locator('.assessment-panel .coordinates')).toContainText(
    '14.55000',
  );
  await expect(page).toHaveURL(/\/explore$/);
  expect(page.context().pages()).toHaveLength(1);
});
