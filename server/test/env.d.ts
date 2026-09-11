/// <reference types="@cloudflare/vitest-pool-workers/types" />
import type { D1Migration } from '@cloudflare/vitest-pool-workers'

/**
 * The pool types `env` as `Cloudflare.Env`, so the bindings the test worker is
 * given have to be declared into that namespace rather than onto a local type.
 */
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      SESSION_SECRET: string
      APP_NAME?: string
      /** Injected by vitest.workers.config.ts from the real migration files. */
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}
