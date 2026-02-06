import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 1024 },
    testIdAttribute: 'data-testid',
    // Removed all timeout configurations
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 0, // No timeout for web server startup
  },
});
