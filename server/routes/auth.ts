import { eq } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import type { SessionUser } from '../../shared/api'
import { loginSchema, signupSchema } from '../../shared/schemas'
import { getDb, newId, schema } from '../db'
import { ApiError } from '../lib/errors'
import { hashPassword, needsRehash, verifyPassword } from '../lib/password'
import { clientKey, consumeRateLimit } from '../lib/rate-limit'
import {
  SESSION_TTL_MS,
  buildSessionCookie,
  clearSessionCookie,
  hashToken,
  newSessionToken,
  readSessionCookie,
} from '../lib/session'
import { parseBody } from '../lib/validate'
import { currentUser, requireUser } from '../middleware/auth'
import oauthRoutes from './oauth'
import type { AppEnv } from '../types'

const auth = new Hono<AppEnv>()

/** Cookies are only marked Secure over HTTPS so local http dev still works. */
const isSecure = (url: string) => new URL(url).protocol === 'https:'

async function startSession(c: Context<AppEnv>, userId: string): Promise<void> {
  const db = getDb(c.env.DB)
  const token = newSessionToken()
  const tokenHash = await hashToken(token, c.env.SESSION_SECRET)
  await db.insert(schema.sessions).values({
    tokenHash,
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  })
  c.header('Set-Cookie', buildSessionCookie(token, { secure: isSecure(c.req.url) }))
}

auth.post('/signup', async (c) => {
  const db = getDb(c.env.DB)
  await consumeRateLimit(db, `signup:${clientKey(c.req.raw.headers)}`, 20, 60 * 60 * 1000)

  const input = await parseBody(c, signupSchema)

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .get()
  if (existing) {
    throw ApiError.conflict('An account already exists for that email. Try signing in.')
  }

  const user = {
    id: newId(),
    email: input.email,
    fullName: input.fullName,
    passwordHash: await hashPassword(input.password),
    // Never assignable from a request body. Organizers are promoted out of band.
    role: 'applicant' as const,
  }

  try {
    await db.insert(schema.users).values(user)
  } catch {
    // Unique index collision from a simultaneous signup in another tab.
    throw ApiError.conflict('An account already exists for that email. Try signing in.')
  }

  await startSession(c, user.id)
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    } satisfies SessionUser,
  })
})

auth.post('/login', async (c) => {
  const db = getDb(c.env.DB)
  await consumeRateLimit(db, `login-ip:${clientKey(c.req.raw.headers)}`, 50, 15 * 60 * 1000)

  const input = await parseBody(c, loginSchema)
  await consumeRateLimit(db, `login:${input.email}`, 10, 15 * 60 * 1000)

  const row = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).get()

  // Identical response for "no such user" and "wrong password", so the endpoint
  // cannot be used to enumerate which emails have accounts.
  const ok = row ? await verifyPassword(input.password, row.passwordHash) : false
  if (!row || !ok) {
    throw ApiError.badRequest('That email and password do not match.')
  }

  if (needsRehash(row.passwordHash)) {
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(input.password) })
      .where(eq(schema.users.id, row.id))
  }

  await startSession(c, row.id)
  return c.json({
    user: {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
    } satisfies SessionUser,
  })
})

auth.post('/logout', async (c) => {
  const token = readSessionCookie(c.req.header('Cookie'))
  if (token) {
    const tokenHash = await hashToken(token, c.env.SESSION_SECRET)
    await getDb(c.env.DB).delete(schema.sessions).where(eq(schema.sessions.tokenHash, tokenHash))
  }
  c.header('Set-Cookie', clearSessionCookie({ secure: isSecure(c.req.url) }))
  return c.json({ ok: true })
})

/** Returns `{ user: null }` rather than 401 so the SPA can boot anonymously. */
auth.get('/me', (c) => c.json({ user: c.get('user') }))

auth.get('/session', requireUser, (c) => c.json({ user: currentUser(c) }))

// Optional third-party sign-in, mounted under the same prefix.
auth.route('/', oauthRoutes)

export default auth
