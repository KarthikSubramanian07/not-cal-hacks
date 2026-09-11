import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { sanitizeOAuthNext } from '../../shared/portal'
import { getDb, newId, schema } from '../db'
import { ApiError } from '../lib/errors'
import { hashPassword } from '../lib/password'
import { SESSION_TTL_MS, buildSessionCookie, hashToken, newSessionToken } from '../lib/session'
import type { AppEnv } from '../types'

/**
 * Sign in with Google.
 *
 * Entirely optional. With no credentials configured the routes report that the
 * provider is off and the sign-in page never offers the button, so the product
 * works out of the box and gains a second sign-in method the moment two secrets
 * exist. Nothing here costs money: Google does not charge for OAuth.
 *
 * Flow is the standard authorization code grant. The `state` parameter is a
 * random value kept in a short-lived HttpOnly cookie and compared on return,
 * which is what stops an attacker from feeding someone else's code into this
 * callback.
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

const STATE_COOKIE = 'nch_oauth_state'
const NEXT_COOKIE = 'nch_oauth_next'
const STATE_TTL_SECONDS = 600

const oauth = new Hono<AppEnv>()

const isConfigured = (env: AppEnv['Bindings']) =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

const redirectUri = (url: string) => new URL('/api/auth/google/callback', url).toString()

const isSecure = (url: string) => new URL(url).protocol === 'https:'

const cookieAttrs = (secure: boolean, maxAge: number) =>
  [
    'Path=/api/auth',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ')

const readCookie = (header: string, name: string) =>
  header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)

/** Lets the sign-in page decide whether to render the button at all. */
oauth.get('/providers', (c) => c.json({ google: isConfigured(c.env) }))

oauth.get('/google', (c) => {
  if (!isConfigured(c.env)) throw ApiError.notFound('Google sign-in is not configured.')

  const secure = isSecure(c.req.url)
  const state = newSessionToken()
  const next = sanitizeOAuthNext(c.req.query('next'))

  c.header('Set-Cookie', `${STATE_COOKIE}=${state}; ${cookieAttrs(secure, STATE_TTL_SECONDS)}`)
  c.header(
    'Set-Cookie',
    `${NEXT_COOKIE}=${encodeURIComponent(next)}; ${cookieAttrs(secure, STATE_TTL_SECONDS)}`,
    {
      append: true,
    },
  )

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: redirectUri(c.req.url),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Only ever asked for once; this is a sign-in, not an integration.
    access_type: 'online',
    prompt: 'select_account',
  })

  return c.redirect(`${AUTHORIZE_URL}?${params.toString()}`)
})

oauth.get('/google/callback', async (c) => {
  if (!isConfigured(c.env)) throw ApiError.notFound('Google sign-in is not configured.')

  const url = new URL(c.req.url)
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')

  const cookie = c.req.header('Cookie') ?? ''
  const expectedState = readCookie(cookie, STATE_COOKIE)
  const next = sanitizeOAuthNext(
    (() => {
      const raw = readCookie(cookie, NEXT_COOKIE)
      try {
        return raw ? decodeURIComponent(raw) : null
      } catch {
        return null
      }
    })(),
  )

  const secure = isSecure(c.req.url)
  c.header('Set-Cookie', `${STATE_COOKIE}=; ${cookieAttrs(secure, 0)}`)
  c.header('Set-Cookie', `${NEXT_COOKIE}=; ${cookieAttrs(secure, 0)}`, { append: true })

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return c.redirect('/login?error=oauth_state')
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID as string,
      client_secret: c.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: redirectUri(c.req.url),
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenResponse.ok) return c.redirect('/login?error=oauth_exchange')

  const tokens = (await tokenResponse.json()) as { access_token?: string }
  if (!tokens.access_token) return c.redirect('/login?error=oauth_exchange')

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileResponse.ok) return c.redirect('/login?error=oauth_profile')

  const profile = (await profileResponse.json()) as {
    email?: string
    email_verified?: boolean
    name?: string
  }

  // An unverified address would let anyone claim an account by that name, and a
  // missing claim is not a verified one.
  if (!profile.email || profile.email_verified !== true) {
    return c.redirect('/login?error=oauth_unverified')
  }

  const email = profile.email.trim().toLowerCase()
  const db = getDb(c.env.DB)

  let user = await db.select().from(schema.users).where(eq(schema.users.email, email)).get()

  if (!user) {
    // A password is still stored, from a value nobody knows, so the row shape
    // stays uniform and a password reset can adopt the account later.
    const id = newId()
    await db.insert(schema.users).values({
      id,
      email,
      fullName: profile.name?.trim() || email.split('@')[0] || 'Applicant',
      passwordHash: await hashPassword(newSessionToken()),
      role: 'applicant',
    })
    user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get()
  }

  if (!user) return c.redirect('/login?error=oauth_profile')

  const token = newSessionToken()
  await db.insert(schema.sessions).values({
    tokenHash: await hashToken(token, c.env.SESSION_SECRET),
    userId: user.id,
    expiresAt: Date.now() + SESSION_TTL_MS,
  })
  c.header('Set-Cookie', buildSessionCookie(token, { secure: isSecure(c.req.url) }), {
    append: true,
  })

  if (next === '/admin' && user.role !== 'organizer') {
    return c.redirect('/login?as=organizer&error=not_organizer')
  }
  if (user.role === 'organizer' && (next === '/apply' || next === '/status')) {
    return c.redirect('/admin')
  }
  return c.redirect(next)
})

export default oauth
