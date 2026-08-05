import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

test('About page states code and data license boundaries', async ({ page }) => {
  await page.goto('/?view=about');

  const licenses = page.locator('.about-page__license');
  await expect(licenses.nth(0)).toContainText(/METER\.AC-owned raw measurements.*CC0/);
  await expect(licenses.nth(0)).toContainText(/NIMH, NIGGG, EEA, OpenStreetMap.*source terms/);
  await expect(licenses.nth(1)).toContainText(/original project code.*Apache License 2\.0/);

  await expect(page.getByRole('link', { name: 'source repository' })).toHaveAttribute(
    'href',
    'https://github.com/meter-ac/my.meter.ac',
  );
  await expect(page.getByRole('link', { name: 'Apache License 2.0' })).toHaveAttribute('href', '/LICENSE.txt');
  await expect(page.getByRole('link', { name: 'project notice' })).toHaveAttribute('href', '/NOTICE.txt');
  await expect(page.getByRole('link', { name: 'third-party notices' })).toHaveAttribute(
    'href',
    '/THIRD_PARTY_NOTICES.txt',
  );
});

test('static legal artifacts are served', async ({ request }) => {
  const artifacts = [
    ['/LICENSE.txt', 'Apache License'],
    ['/NOTICE.txt', 'Copyright 2026 METER.AC contributors'],
    ['/THIRD_PARTY_NOTICES.txt', 'Hippocratic License 2.1'],
  ];

  for (const [path, expectedText] of artifacts) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should be available`).toBe(true);
    expect(await response.text()).toContain(expectedText);
  }
});

test('root and public legal files stay byte-synchronized', async () => {
  const files = [
    ['LICENSE', 'public/LICENSE.txt'],
    ['NOTICE', 'public/NOTICE.txt'],
    ['THIRD_PARTY_NOTICES.md', 'public/THIRD_PARTY_NOTICES.txt'],
  ];

  for (const [rootPath, publicPath] of files) {
    const [rootContents, publicContents] = await Promise.all([
      readFile(`${projectRoot}/${rootPath}`),
      readFile(`${projectRoot}/${publicPath}`),
    ]);
    expect(publicContents.equals(rootContents), `${publicPath} should match ${rootPath}`).toBe(true);
  }
});

test('map tiles use the current OSM host with an origin Referer', async ({ page }) => {
  const mapSource = await readFile(`${projectRoot}/src/components/StationMap.jsx`, 'utf8');
  expect(mapSource).toContain('url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"');
  expect(mapSource).not.toMatch(/https:\/\/(?:\{s\}|[abc])\.tile\.openstreetmap\.org/);

  const tileRequestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.hostname === 'tile.openstreetmap.org' && /\/\d+\/\d+\/\d+\.png$/.test(url.pathname);
  });

  await page.goto('/');
  const tileRequest = await tileRequestPromise;
  const tileUrl = new URL(tileRequest.url());
  const referer = tileRequest.headers().referer;

  expect(tileUrl.protocol).toBe('https:');
  expect(tileUrl.hostname).toBe('tile.openstreetmap.org');
  expect(referer).toBeTruthy();
  expect(new URL(referer).origin).toBe(new URL(page.url()).origin);
  expect(new URL(referer).pathname).toBe('/');
});
