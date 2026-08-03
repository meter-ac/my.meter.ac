import { test, expect } from '@playwright/test';

// Smoke coverage for the app's core flows against the real live backend (see
// playwright.config.js for why there's no mock). Assertions tolerate live
// data changing — station/camera counts, which stations are online, etc. —
// rather than asserting exact numbers that would go stale.

function collectConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test('map loads stations and renders markers', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/');
  await expect(page.locator('.station-dot').first()).toBeVisible({ timeout: 15000 });
  const markerCount = await page.locator('.station-dot').count();
  expect(markerCount).toBeGreaterThan(10);
  await expect(page.locator('.app__subtitle')).toContainText(/\d+ of \d+ stations/);
  expect(errors).toEqual([]);
});

test('table view renders and category-switches', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/?view=table');
  await expect(page.locator('.table-view table tbody tr').first()).toBeVisible({ timeout: 15000 });

  for (const label of ['Meteo', 'Earth', 'Earthquakes', 'Radiation']) {
    await page.click(`.table-view__categories button:has-text("${label}")`);
    // Each category either shows its table or a loading/error status —
    // never a blank pane — before settling.
    await expect(page.locator('.table-view-container')).not.toBeEmpty();
    await page.waitForTimeout(1500);
  }
  expect(errors).toEqual([]);
});

test('node detail page loads via click-through and via direct ?node= deep link', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/');
  await expect(page.locator('.station-dot').first()).toBeVisible({ timeout: 15000 });
  // force: true — markers are dense enough at the default zoom that the
  // first one is frequently visually overlapped by a neighboring marker's
  // hit area; force bypasses Playwright's pointer-interception check and
  // dispatches directly to this marker's own element regardless.
  await page.locator('.station-dot').first().click({ force: true });
  await page.click('text=View node page');

  await expect(page).toHaveURL(/\?node=/);
  await expect(page.locator('.node-page__back')).toBeVisible();
  const url = new URL(page.url());
  const nodeId = url.searchParams.get('node');
  expect(nodeId).toBeTruthy();

  // Reload from scratch on the deep link — should render the same node
  // without having clicked through the map first.
  await page.goto(`/?node=${nodeId}`);
  await expect(page.locator('.node-page__back')).toBeVisible();
  await expect(page.locator('.node-page__meta')).toContainText(nodeId);
  expect(errors).toEqual([]);
});

test('overview category switch renders all sections without console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/?view=overview');
  await expect(page.locator('.overview-view__categories button').first()).toBeVisible();

  const expectedHeadings = {
    Network: 'Right now',
    NIMH: 'NIMH weather stations',
    Earthquakes: 'Regional earthquakes',
    Radiation: 'Background radiation (EEA)',
  };
  for (const [label, heading] of Object.entries(expectedHeadings)) {
    await page.click(`.overview-view__categories button:has-text("${label}")`);
    await expect(page.locator('h2', { hasText: heading })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
  }
  expect(errors).toEqual([]);
});
