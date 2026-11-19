import type { UserRole } from '../shared/constants'

export interface Env {
  /**
   * The database, behind the D1 client API. It is a Durable Object underneath;
   * `withDatabase` in `db/durable.ts` builds this from the raw binding before
   * the app sees the request.
   */
  DB: D1Database
  /** HMAC key for session tokens. Set with `wrangler pages secret put`. */
  SESSION_SECRET: string
  APP_NAME?: string
  /**
   * Optional. Set both to enable Sign in with Google; leave unset and the
   * provider simply never appears.
   */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

export interface AuthedUser {
  id: string
  email: string
  fullName: string
  role: UserRole
}

/** Hono context variables set by middleware. */
export interface Vars {
  user: AuthedUser | null
}

export type AppEnv = { Bindings: Env; Variables: Vars }
