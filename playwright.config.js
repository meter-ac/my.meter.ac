import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

// Hits the real backend (meter.uni-plovdiv.net InfluxDB + meter.ac static
// files) rather than mocking — this app has no backend of its own, it's a
// thin client over those two, so there's nothing meaningful to mock without
// duplicating their response shapes. Tradeoff: assertions have to tolerate
// live data changing (station counts, camera online/offline mix, etc.)
// rather than asserting exact numbers. See TODO.md for the fuller reasoning.
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  retries: 1,
  forbidOnly: isCI,
  reporter: isCI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
