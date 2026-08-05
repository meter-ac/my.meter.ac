import { test, expect } from '@playwright/test';
import { filterTukeyOutliers } from '../src/color/colorScale.js';

// Covers the curator settings modal (Tukey fence toggle, offline-camera
// visibility, interpolation method) and the camera gallery's region filter.
// Same live-backend tradeoff as core-flows.spec.js — counts are compared
// relatively (e.g. filtered <= unfiltered) rather than pinned to exact
// numbers, since which cameras/stations are online changes constantly.

test('curator settings modal opens, has both toggles, and closes', async ({ page }) => {
  await page.goto('/');
  await page.click('.app__settings-button');
  await expect(page.locator('.modal__header h2')).toHaveText('Curator settings');
  await expect(page.locator('.modal__option input[type=checkbox]')).toHaveCount(2);
  await expect(page.locator('input[name=interpolationMethod]')).toHaveCount(2);
  await page.click('.modal__close');
  await expect(page.locator('.modal-overlay')).toHaveCount(0);
});

test('Tukey-fence and offline-camera settings persist to localStorage across reload', async ({ page }) => {
  await page.goto('/');
  await page.click('.app__settings-button');
  const tukeyCheckbox = page.locator('.modal__option').nth(0).locator('input[type=checkbox]');
  const camerasCheckbox = page.locator('.modal__option').nth(1).locator('input[type=checkbox]');

  await expect(tukeyCheckbox).toBeChecked();
  await expect(camerasCheckbox).toBeChecked();
  await tukeyCheckbox.uncheck();
  await camerasCheckbox.uncheck();
  await page.click('.modal__close');

  const stored = await page.evaluate(() => localStorage.getItem('meteracnew.curatorSettings'));
  expect(JSON.parse(stored)).toMatchObject({ useTukeyFences: false, showOfflineCameras: false });

  await page.reload();
  await page.click('.app__settings-button');
  await expect(page.locator('.modal__option').nth(0).locator('input[type=checkbox]')).not.toBeChecked();
  await expect(page.locator('.modal__option').nth(1).locator('input[type=checkbox]')).not.toBeChecked();

  // Reset back to defaults so this doesn't leak into other tests/manual use.
  await page.locator('.modal__option').nth(0).locator('input[type=checkbox]').check();
  await page.locator('.modal__option').nth(1).locator('input[type=checkbox]').check();
});

test('hiding offline cameras reduces the gallery to a subset with no offline badges', async ({ page }) => {
  const settledCameraIds = new Set();
  const trackSettledCamera = (request) => {
    if (request.method() !== 'HEAD') return;
    const match = new URL(request.url()).pathname.match(/^\/gs\/nodes\/([^/]+)\/snap\.jpg$/);
    if (match) settledCameraIds.add(match[1]);
  };
  page.on('requestfinished', trackSettledCamera);
  page.on('requestfailed', trackSettledCamera);

  const cameraListResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.hostname === 'meter.ac' && url.pathname === '/gs/nodes/nodes.txt';
  });
  await page.goto('/?view=cameras');
  await expect(page.locator('.camera-card').first()).toBeVisible({ timeout: 15000 });
  const cameraList = await (await cameraListResponse).text();
  const camerasLine = cameraList.split('\n').find((line) => line.startsWith('cams'));
  const expectedCameraIds = camerasLine
    .replace(/^cams\s*:\s*/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  await expect
    .poll(() => expectedCameraIds.every((id) => settledCameraIds.has(id)), { timeout: 15000 })
    .toBe(true);

  const totalCount = await page.locator('.camera-card').count();
  const offlineCount = await page.locator('.camera-card__badge').count();

  await page.click('.app__settings-button');
  await page.locator('.modal__option').nth(1).locator('input[type=checkbox]').uncheck();
  await page.click('.modal__close');

  await expect(page.locator('.camera-card')).toHaveCount(totalCount - offlineCount);
  await expect(page.locator('.camera-card__badge')).toHaveCount(0);

  // Reset.
  await page.click('.app__settings-button');
  await page.locator('.modal__option').nth(1).locator('input[type=checkbox]').check();
  await page.click('.modal__close');
});

test('camera region filter narrows the gallery', async ({ page }) => {
  await page.goto('/?view=cameras');
  await expect(page.locator('.camera-card').first()).toBeVisible({ timeout: 15000 });
  const allCount = await page.locator('.camera-card').count();

  await page.click('.camera-gallery__regions button:has-text("Mountain")');
  await page.waitForTimeout(300);
  const mountainCount = await page.locator('.camera-card').count();
  expect(mountainCount).toBeLessThanOrEqual(allCount);
  expect(mountainCount).toBeGreaterThan(0);

  await page.click('.camera-gallery__regions button:has-text("All")');
  await page.waitForTimeout(300);
  await expect(page.locator('.camera-card')).toHaveCount(allCount);
});

test('toggling outlier fencing changes the rendered heatmap surface', async ({ page }) => {
  // Regression check for the Krichim (N205) case without requiring that bad
  // reading to remain live forever. When the response currently has a Tukey
  // outlier, the image must change; otherwise the toggle still gets exercised.
  const latestReadingsResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    const query = url.searchParams.get('q');
    return (
      url.hostname === 'meter.uni-plovdiv.net' &&
      url.pathname === '/query' &&
      query?.startsWith('select last(ts)')
    );
  });
  await page.goto('/');
  const latestReadings = await (await latestReadingsResponse).json();
  const pressurePoints = (latestReadings.results?.[0]?.series ?? []).flatMap((series) => {
    const pressureIndex = series.columns.indexOf('p_sea');
    const value = series.values?.[0]?.[pressureIndex];
    return typeof value === 'number' && Number.isFinite(value) ? [{ value }] : [];
  });
  const hasLiveOutlier = filterTukeyOutliers(pressurePoints).length < pressurePoints.length;

  await page.selectOption('#parameter-select', 'p_sea');
  await page.click('text=Show interpolated surface');
  const heatmapImg = page.locator('.leaflet-image-layer');
  await expect(heatmapImg).toBeVisible({ timeout: 10000 });
  const fencedSrc = await heatmapImg.getAttribute('src');

  await page.click('.app__settings-button');
  await page.locator('.modal__option').nth(0).locator('input[type=checkbox]').uncheck();
  await page.click('.modal__close');
  if (hasLiveOutlier) {
    await expect.poll(() => heatmapImg.getAttribute('src'), { timeout: 10000 }).not.toBe(fencedSrc);
  } else {
    await expect(heatmapImg).toBeVisible();
    test.info().annotations.push({
      type: 'note',
      description: 'No live pressure outlier was available for image comparison.',
    });
  }

  // Reset.
  await page.click('.app__settings-button');
  await page.locator('.modal__option').nth(0).locator('input[type=checkbox]').check();
  await page.click('.modal__close');
});

test('switching interpolation method (IDW <-> Voronoi) re-renders the heatmap without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await page.selectOption('#parameter-select', 'p_sea');
  await page.click('text=Show interpolated surface');
  await expect(page.locator('.leaflet-image-layer')).toBeVisible({ timeout: 10000 });

  await page.click('.app__settings-button');
  await page.locator('input[name=interpolationMethod][value=voronoi]').check();
  await page.click('.modal__close');
  await page.waitForTimeout(1000);
  await expect(page.locator('.leaflet-image-layer')).toBeVisible();

  await page.click('.app__settings-button');
  await page.locator('input[name=interpolationMethod][value=idw]').check();
  await page.click('.modal__close');
  await page.waitForTimeout(1000);
  await expect(page.locator('.leaflet-image-layer')).toBeVisible();

  expect(errors).toEqual([]);
});
