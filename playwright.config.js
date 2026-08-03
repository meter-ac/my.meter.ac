import { defineConfig } from '@playwright/test';

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
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
