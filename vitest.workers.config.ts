import { fileURLToPath, URL } from 'node:url'
import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineProject } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The test worker is the real companion Worker from `worker/`, so the suite
// talks to the real database object, which applies the real migrations to
// itself on first use. Nothing about the schema is a fixture.
export default defineProject({
  plugins: [
    cloudflareTest({
      singleWorker: true,
      isolatedStorage: true,
      wrangler: { configPath: './worker/wrangler.toml' },
      miniflare: {
        bindings: {
          APP_NAME: 'not-cal-hacks (test)',
          SESSION_SECRET: 'test-session-secret-not-used-in-production',
          ADMIN_TOKEN: 'test-admin-token-not-used-in-production',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@shared': r('./shared'),
      '@server': r('./server'),
    },
  },
  test: {
    name: 'api',
    include: ['server/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})
