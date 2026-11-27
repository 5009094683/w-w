import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run a real browser against the built site.
//
//   npm run test:e2e
//
// That script builds the site for Node and starts it with every outside service
// (payment gateways, Turnstile, Resend) answered by tests/e2e/support/mock-gateways.mjs,
// so the real pages and the real server routes run without keys, charges or emails.

const PORT = 4173

export const E2E = {
  baseURL: `http://127.0.0.1:${PORT}`,
  controlURL: 'http://127.0.0.1:4199',
  razorpaySecret: 'e2e-razorpay-secret',
  zohoSigningKey: 'e2e-zoho-signing-key',
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: E2E.baseURL,
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /site\.spec\.ts/ },
  ],

  webServer: {
    command: 'node --import ./tests/e2e/support/mock-gateways.mjs .output/server/index.mjs',
    url: E2E.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      TURNSTILE_SECRET_KEY: 'e2e-turnstile-secret',
      RESEND_API_KEY: 're_e2e_key',
      RAZORPAY_IS_SANDBOX: 'true',
      RAZORPAY_TEST_KEY_ID: 'rzp_test_E2E0000000001',
      RAZORPAY_TEST_KEY_SECRET: E2E.razorpaySecret,
      PHONEPE_CLIENT_ID: 'e2e-phonepe-client',
      PHONEPE_API_KEY: 'e2e-phonepe-secret',
      ZOHO_ACCOUNT_ID: '23137556',
      ZOHO_API_KEY: 'e2e-zoho-widget-key',
      ZOHO_SIGN_KEY: E2E.zohoSigningKey,
      ZOHO_CLIENT_ID: 'e2e-zoho-client',
      ZOHO_CLIENT_SECRET: 'e2e-zoho-client-secret',
      ZOHO_REFRESH_TOKEN: 'e2e-zoho-refresh-token',
      ZOHO_IS_SANDBOX: 'true',
    },
  },
})
