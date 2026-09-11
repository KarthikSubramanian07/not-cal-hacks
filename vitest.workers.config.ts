import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineProject } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The same migration files that ship to production are replayed into each test
// worker, so the API suite runs against the real schema rather than a fixture.
const migrations = await readD1Migrations(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'drizzle'),
)

export default defineProject({
  plugins: [
    cloudflareTest({
      singleWorker: true,
      isolatedStorage: true,
      miniflare: {
        compatibilityDate: '2026-08-22',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['DB'],
        bindings: {
          APP_NAME: 'not-cal-hacks (test)',
          SESSION_SECRET: 'test-session-secret-not-used-in-production',
          TEST_MIGRATIONS: migrations,
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
    include: ['server/**/*.test.ts'],
    setupFiles: ['./server/test/apply-migrations.ts'],
  },
})
