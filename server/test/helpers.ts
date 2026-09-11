import { env } from 'cloudflare:test'
import app from '../app'

/**
 * Calls the real Hono app with the real D1 binding.
 *
 * Each call gets its own client IP unless one is supplied, because the auth
 * routes are genuinely rate limited per IP and a shared address would make the
 * twenty-first test in a file fail for the wrong reason. Tests that care about
 * the limiter pass a fixed `ip` and assert on it.
 */
export async function call(
  path: string,
  init: RequestInit & { cookie?: string; ip?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (init.cookie) headers.set('Cookie', init.cookie)
  headers.set('CF-Connecting-IP', init.ip ?? crypto.randomUUID())
  return app.fetch(new Request(`https://test.local${path}`, { ...init, headers }), env)
}

/** Extracts the session cookie from a Set-Cookie header. */
export function sessionCookie(response: Response): string {
  const raw = response.headers.get('Set-Cookie') ?? ''
  return raw.split(';')[0] ?? ''
}

/** Signs a user up and returns their cookie and id. */
export async function signUp(email: string, password = 'hunter2hunter2', fullName = 'Test User') {
  const response = await call('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  })
  if (response.status !== 200) throw new Error(`signup failed: ${response.status}`)
  const body = (await response.json()) as { user: { id: string } }
  return { cookie: sessionCookie(response), id: body.user.id }
}

/** Promotes a user to organizer, the way the seed script does. */
export async function promote(userId: string) {
  await env.DB.prepare('update users set role = ? where id = ?').bind('organizer', userId).run()
}

/** A complete, valid set of hacker answers. */
export const validHackerAnswers = {
  firstName: 'Test',
  lastName: 'User',
  school: 'UC Berkeley',
  gradYear: 2028,
  major: 'EECS',
  experienceLevel: 'first',
  tracks: ['AI'],
  tshirtSize: 'M',
  whyNotCalHacks:
    'I want to finally finish something I started, in a room where nobody lets me quietly give up on it halfway through.',
  proudestProject:
    'A tiny command line tool that renames my screenshots so I can actually find them later. Four hundred lines, used daily.',
}

/** A user who has been promoted to organizer and can reach /api/admin. */
export async function organizer(email: string) {
  const user = await signUp(email)
  await promote(user.id)
  return user
}

/** A hacker application that exists but has not been sent. */
export async function draftApplication(email: string) {
  const applicant = await signUp(email)
  const created = await call('/api/applications', {
    method: 'POST',
    cookie: applicant.cookie,
    body: JSON.stringify({ type: 'hacker' }),
  })
  const { application } = (await created.json()) as { application: { id: string } }
  return { id: application.id, applicant }
}

/** The same application, filled in and submitted. */
export async function submittedApplication(email: string) {
  const draft = await draftApplication(email)
  await call(`/api/applications/${draft.id}`, {
    method: 'PATCH',
    cookie: draft.applicant.cookie,
    body: JSON.stringify({ answers: validHackerAnswers }),
  })
  await call(`/api/applications/${draft.id}/submit`, {
    method: 'POST',
    cookie: draft.applicant.cookie,
  })
  return draft
}

/** How many audit rows record a given transition. Concurrency tests live here. */
export async function countEvents(applicationId: string, toStatus: string) {
  const row = await env.DB.prepare(
    'select count(*) as n from status_events where application_id = ? and to_status = ?',
  )
    .bind(applicationId, toStatus)
    .first<{ n: number }>()
  return row?.n ?? 0
}
