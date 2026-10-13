import { test, expect } from '@playwright/test';

test('collapsed sidebar releases its grid column at desktop widths', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  for (const width of [1100, 1700]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/explore');
    const sidebar = page.locator('.sidebar');
    const workspace = page.locator('.workspace');
    const before = await workspace.boundingBox();
    await page
      .getByRole('button', { name: 'Collapse sidebar', exact: true })
      .click();
    await expect
      .poll(async () => (await sidebar.boundingBox())?.width)
      .toBe(76);
    const after = await workspace.boundingBox();
    expect(after!.width).toBeGreaterThan(before!.width);
    expect(after!.x).toBe(76);
    await expect(
      sidebar.getByRole('link', { name: 'Explore Map', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Expand sidebar', exact: true })
      .click();
    await expect
      .poll(async () => (await workspace.boundingBox())?.width)
      .toBe(before!.width);
  }
});

test('small screens prioritize the map and reveal secondary tools on demand', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  for (const width of [360, 412, 820]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/explore');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Zoom in', exact: true }),
    ).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Load nearby OSM', exact: true }),
    ).toBeHidden();
    await expect(page.locator('.map-caption')).toBeHidden();
    await expect(page.locator('.ring-note')).toBeHidden();
    const map = await page.locator('.map-frame').boundingBox();
    const assessment = await page.locator('.assessment-panel').boundingBox();
    expect(map!.height).toBeGreaterThan(600);
    expect(map!.y + map!.height).toBeLessThanOrEqual(assessment!.y + 1);
    await page
      .getByRole('button', { name: 'More map tools', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Zoom in', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Load nearby OSM', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Map layers', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Load nearby OSM', exact: true }),
    ).toBeHidden();
    const layers = await page
      .getByRole('region', { name: 'Map layer controls' })
      .boundingBox();
    expect(layers!.x).toBeGreaterThanOrEqual(0);
    expect(layers!.x + layers!.width).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Close map layers' }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/mobile-layout-${width}.png`,
      fullPage: true,
    });
  }
});
