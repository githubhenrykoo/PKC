import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './playwright-tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4321',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/test-retry */
    trace: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'on',

    /* Record video on failure */
    video: 'on',

    /* Run tests in headed mode for visual debugging */
    headless: process.env.CI ? true : false, // Run headless in CI, headed locally

    /* Viewport settings */
    viewport: { width: 1280, height: 1024 },

    /* Timeout settings */
    actionTimeout: 30000,  // 30 seconds for actions
    navigationTimeout: 60000,  // 60 seconds for page loads
    testIdAttribute: 'data-testid',

    /* Overall test timeout */
    timeout: 300000,  // 5 minutes total
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // headless mode is controlled globally above
      },
    },

    // Uncomment for testing other browsers if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4321',
    reuseExistingServer: true,  // Always reuse existing server since docker-compose starts it
    timeout: 120 * 1000,
  },
});
