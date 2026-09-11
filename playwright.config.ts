import { defineConfig, devices } from '@playwright/test'

const PORT = 8788
const baseURL = `http://127.0.0.1:${PORT}`

/**
 * End-to-end runs against `wrangler pages dev`, which is the same runtime and
 * the same Functions bundle that ships to Cloudflare. Running against the Vite
 * dev server instead would test a stack that never reaches production.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html'], ['github']] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx wrangler pages dev --port ${PORT} --log-level warn`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
