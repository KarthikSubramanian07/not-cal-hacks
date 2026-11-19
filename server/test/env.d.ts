/// <reference types="@cloudflare/vitest-plugin/types" />
import type { AppDatabase } from '../../worker/database'

/**
 * The pool types `env` as `Cloudflare.Env`, so the bindings the test worker is
 * given have to be declared into that namespace rather than onto a local type.
 */
declare global {
  namespace Cloudflare {
    interface Env {
      /** The database object, exactly as the companion Worker declares it. */
      DATABASE: DurableObjectNamespace<AppDatabase>
      SESSION_SECRET: string
      APP_NAME?: string
      ADMIN_TOKEN: string
    }
  }
}

export {}
