import { eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { getDb, schema } from '../db'
import { ApiError } from '../lib/errors'
import { hashToken, readSessionCookie } from '../lib/session'
import type { AppEnv, AuthedUser } from '../types'

/**
 * Resolves the session cookie into a user, or null. Never throws: routes decide
 * for themselves whether anonymous access is allowed.
 */
export const loadUser = createMiddleware<AppEnv>(async (c, next) => {
  c.set('user', null)
  const token = readSessionCookie(c.req.header('Cookie'))
  if (token) {
    const db = getDb(c.env.DB)
    const tokenHash = await hashToken(token, c.env.SESSION_SECRET)
    const row = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        role: schema.users.role,
        expiresAt: schema.sessions.expiresAt,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(eq(schema.sessions.tokenHash, tokenHash))
      .get()

    if (row && row.expiresAt > Date.now()) {
      const { expiresAt: _expiresAt, ...user } = row
      c.set('user', user satisfies AuthedUser)
    }
  }
  await next()
})

/**
 * Every protected route re-checks authorization here, at the point of use.
 *
 * D1 has no row-level security, so unlike a Postgres deployment there is no
 * second wall behind the application. That makes this the wall, which is why
 * authorization is one shared middleware plus explicit ownership checks in each
 * handler, rather than something each route reimplements.
 */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) throw ApiError.unauthorized()
  await next()
})

export const requireOrganizer = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user')
  if (!user) throw ApiError.unauthorized()
  if (user.role !== 'organizer') throw ApiError.forbidden('Organizer access only.')
  await next()
})

/** Narrowing helper so handlers do not repeat the null check. */
export function currentUser(c: { get: (k: 'user') => AuthedUser | null }): AuthedUser {
  const user = c.get('user')
  if (!user) throw ApiError.unauthorized()
  return user
}
