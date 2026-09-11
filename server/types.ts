import type { UserRole } from '../shared/constants'

export interface Env {
  DB: D1Database
  /** HMAC key for session tokens. Set with `wrangler pages secret put`. */
  SESSION_SECRET: string
  APP_NAME?: string
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
