import type { D1Migration } from '@cloudflare/vitest-pool-workers/config'
import type { Env } from '../types'

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    /** Injected by vitest.workers.config.ts from the real migration files. */
    TEST_MIGRATIONS: D1Migration[]
  }
}
