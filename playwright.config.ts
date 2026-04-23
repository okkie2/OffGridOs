import { defineConfig, devices } from '@playwright/test';

const OFFGRIDOS_BASE_URL = process.env.OFFGRIDOS_BASE_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  webServer: {
    command: 'node tests/e2e/start-server.mjs',
    url: OFFGRIDOS_BASE_URL,
    reuseExistingServer: true,
    timeout: 300_000,
  },
  use: {
    baseURL: OFFGRIDOS_BASE_URL,
    channel: 'chrome',
    ...devices['Desktop Chrome'],
  },
});
