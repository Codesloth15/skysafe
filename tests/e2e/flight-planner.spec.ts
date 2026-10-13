import { test, expect } from '@playwright/test';
import { airport, zone } from '../fixtures';

test.beforeEach(async ({ page }) => {
  await page.route('**/data/airports.json', (route) =>
    route.fulfill({
      json: {
        airports: [airport],
        sources: [
          {
            name: 'Synthetic',
            url: 'https://example.com',
            attribution: 'Tests',
            importedAt: airport.updatedAt,
            status: 'available',
            message: 'Test',
          },
        ],
        importedAt: airport.updatedAt,
      },
    }),
  );
  await page.route('**/api.open-meteo.com/**', (route) => {
    const nowHour = Math.floor(Date.now() / 3600000) * 3600;
    const time = Array.from({ length: 72 }, (_, i) => nowHour + i * 3600);
    return route.fulfill({
      json: {
        hourly: {
          time,
          wind_speed_10m: time.map(() => 3),
          wind_direction_10m: time.map(() => 90),
          wind_gusts_10m: time.map(() => 5),
        },
      },
    });
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          success: (p: {
            coords: { latitude: number; longitude: number };
          }) => void,
        ) => success({ coords: { latitude: 14.6, longitude: 121 } }),
      },
    }),
  );
});

test('plans and edits a route with departure wind and a drone preview', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Plan flight', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'DJI FPV drone icon' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Use my location as start' }).click();
  await expect(
    page.getByText('1 points · tap to add, drag to move'),
  ).toBeVisible();
  await page.waitForTimeout(1300);
  const map = page.locator('.leaflet-container');
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.32, y: box.height * 0.42 } });
  await map.click({ position: { x: box.width * 0.6, y: box.height * 0.34 } });
  await expect(
    page.getByText('3 points · tap to add, drag to move'),
  ).toBeVisible();
  await expect(page.locator('.flight-route-line')).toHaveCount(3);
  // Drag an existing waypoint without appending another point.
  const waypoint = page.locator('[title="Waypoint 1"]');
  const point = (await waypoint.boundingBox())!;
  await page.mouse.move(point.x + 15, point.y + 15);
  await page.mouse.down();
  await page.mouse.move(point.x + 40, point.y + 45, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByText('3 points · tap to add, drag to move'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const planner = page.getByRole('complementary', { name: 'Flight planner' });
  await expect(planner.getByText('3.0 m/s', { exact: true })).toBeVisible();
  await planner.getByLabel('Wind source').selectOption('manual');
  await planner.getByLabel('Wind speed (m/s)', { exact: true }).fill('4');
  await planner
    .getByRole('checkbox', { name: 'Include return to start' })
    .uncheck();
  await expect(page.locator('.flight-route-line')).toHaveCount(2);
  await planner
    .getByRole('slider', { name: 'Flight time budget', exact: true })
    .fill('1');
  await expect(
    planner.getByText(/Route exceeds your available time/),
  ).toBeVisible();
  await planner
    .getByRole('slider', { name: 'Flight time budget', exact: true })
    .fill('12');
  await planner
    .getByRole('button', { name: 'Preview flight', exact: true })
    .click();
  await expect(
    planner.getByRole('button', { name: 'Pause preview' }),
  ).toBeVisible();
  await expect(page.locator('.flight-drone')).toHaveCount(1);
  await planner.getByRole('button', { name: 'Pause preview' }).click();
  await planner
    .getByRole('slider', { name: 'Flight preview progress' })
    .fill('50');
  await expect(planner.getByText('50%', { exact: true })).toBeVisible();
  await planner.getByRole('button', { name: 'Fit route', exact: true }).click();
  if (testInfo.project.name === 'mobile')
    await expect
      .poll(async () => (await planner.boundingBox())?.height)
      .toBe(54);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-flight-route.png`,
    fullPage: true,
  });
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Flight plan details' }).click();
  await planner.getByLabel('Wind source').selectOption('forecast');
  await planner
    .getByLabel('Departure (Philippines, UTC+8)')
    .fill('2035-01-01T12:00');
  await expect(
    planner.getByText(/Wind data is unavailable for this departure/),
  ).toBeVisible();
  await expect(
    planner.getByText('Calm-air baseline', { exact: true }),
  ).toBeVisible();
  await planner.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('.flight-route-line')).toHaveCount(0);
  await expect(page.locator('.flight-drone')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Inspect location', exact: true })
    .click();
  await expect(
    page.getByRole('complementary', { name: 'Location assessment' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('allows map start selection when geolocation is denied', async ({
  page,
}) => {
  await page.route('**/api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
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
  await page.getByRole('button', { name: 'Plan flight', exact: true }).click();
  await page.getByRole('button', { name: 'Use my location as start' }).click();
  await expect(page.getByText(/Could not access your location/)).toBeVisible();
  await page.getByRole('button', { name: 'Pick start on map' }).click();
  const map = page.locator('.leaflet-container');
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(
    page.getByText('1 points · tap to add, drag to move'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByText('Data request failed (503).', { exact: true }),
  ).toBeVisible();
});

test('blocks a no-fly start even when the zone layer is hidden', async ({
  page,
}) => {
  const { geometry, ...properties } = zone;
  await page.route('**/data/restricted-zones.geojson', (route) =>
    route.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: { ...properties, category: 'PROHIBITED' },
          },
        ],
      },
    }),
  );
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Map layers', exact: true }).click();
  await expect(page.getByLabel(/Verified prohibited zones/)).toBeEnabled();
  await page.getByLabel(/Verified prohibited zones/).uncheck();
  await page.getByRole('button', { name: 'Close map layers' }).click();
  await page.getByRole('button', { name: 'Plan flight', exact: true }).click();
  await page.getByRole('button', { name: 'Use my location as start' }).click();
  const planner = page.getByRole('complementary', { name: 'Flight planner' });
  await expect(
    planner.getByText(/Flight planning blocked: route enters a no-fly zone/),
  ).toBeVisible();
  await expect(page.locator('[title="Route start"]')).toHaveCount(0);
  await expect(
    planner.getByRole('button', { name: 'Preview flight', exact: true }),
  ).toBeDisabled();
  await expect(
    planner.getByRole('slider', { name: 'Flight preview progress' }),
  ).toBeDisabled();
});

test('blocks starting a route when restriction data cannot load', async ({
  page,
}) => {
  await page.route('**/data/restricted-zones.geojson', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Plan flight', exact: true }).click();
  await page.getByRole('button', { name: 'Use my location as start' }).click();
  await expect(page.locator('[title="Route start"]')).toHaveCount(0);
  const planner = page.getByRole('complementary', { name: 'Flight planner' });
  await expect(planner.getByText(/Flight planning blocked:/)).toBeVisible();
  await expect(
    planner.getByRole('button', { name: 'Retry airspace data' }),
  ).toBeVisible();
});
