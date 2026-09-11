import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { call, promote, sessionCookie, signUp, validHackerAnswers } from '../test/helpers'

/**
 * These run against a real D1 database with the real migrations applied, and
 * they call the real Hono app. Nothing here is mocked, so a broken constraint
 * or a broken authorization check fails the suite rather than passing a stub.
 */

// Fresh identities per test keep the unique email index from bleeding across.
let counter = 0
const uniqueEmail = () => `user${counter++}-${crypto.randomUUID().slice(0, 8)}@example.edu`

describe('auth', () => {
  it('creates an account and returns a session cookie', async () => {
    const response = await call('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail(),
        password: 'hunter2hunter2',
        fullName: 'Test User',
      }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Set-Cookie')).toMatch(/nch_session=/)
    expect(response.headers.get('Set-Cookie')).toMatch(/HttpOnly/)
  })

  it('never lets a signup request assign its own role', async () => {
    const email = uniqueEmail()
    await call('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'hunter2hunter2',
        fullName: 'Sneaky',
        role: 'organizer',
      }),
    })
    const row = await env.DB.prepare('select role from users where email = ?').bind(email).first()
    expect(row?.role).toBe('applicant')
  })

  it('refuses a duplicate email', async () => {
    const email = uniqueEmail()
    const body = JSON.stringify({ email, password: 'hunter2hunter2', fullName: 'A' })
    await call('/api/auth/signup', { method: 'POST', body })
    const second = await call('/api/auth/signup', { method: 'POST', body })
    expect(second.status).toBe(409)
  })

  it('gives the same answer for a wrong password and a missing account', async () => {
    const email = uniqueEmail()
    await call('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'hunter2hunter2', fullName: 'A' }),
    })

    const wrongPassword = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrongwrongwrong' }),
    })
    const noSuchUser = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: 'wrongwrongwrong' }),
    })

    expect(wrongPassword.status).toBe(noSuchUser.status)
    expect(await wrongPassword.clone().text()).toBe(await noSuchUser.clone().text())
  })

  it('signs in with the right password', async () => {
    const email = uniqueEmail()
    await call('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'hunter2hunter2', fullName: 'A' }),
    })
    const response = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'hunter2hunter2' }),
    })
    expect(response.status).toBe(200)
  })

  it('reports nobody for an anonymous caller', async () => {
    const response = await call('/api/auth/me')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: null })
  })

  it('forgets the session after logout', async () => {
    const { cookie } = await signUp(uniqueEmail())
    await call('/api/auth/logout', { method: 'POST', cookie })
    const after = await call('/api/auth/me', { cookie })
    expect(await after.json()).toEqual({ user: null })
  })

  it('stores a hash of the session token, never the token itself', async () => {
    const { cookie } = await signUp(uniqueEmail())
    const token = cookie.split('=')[1] ?? ''
    const row = await env.DB.prepare('select token_hash from sessions where token_hash = ?')
      .bind(token)
      .first()
    expect(row).toBeNull()
  })
})

describe('applications', () => {
  let cookie: string

  beforeEach(async () => {
    cookie = (await signUp(uniqueEmail())).cookie
  })

  it('refuses anonymous callers', async () => {
    const response = await call('/api/applications')
    expect(response.status).toBe(401)
  })

  it('creates one draft per type, idempotently', async () => {
    const first = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const second = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const a = (await first.json()) as { application: { id: string } }
    const b = (await second.json()) as { application: { id: string } }
    expect(a.application.id).toBe(b.application.id)
  })

  it('allows one application of each type', async () => {
    await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const mentor = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'mentor' }),
    })
    expect(mentor.status).toBe(201)
  })

  it('merges autosaves rather than replacing them', async () => {
    const created = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }

    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ answers: { firstName: 'Amara' } }),
    })
    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ answers: { school: 'UC Berkeley' } }),
    })

    const read = await call(`/api/applications/${application.id}`, { cookie })
    const body = (await read.json()) as { application: { answers: Record<string, unknown> } }
    expect(body.application.answers.firstName).toBe('Amara')
    expect(body.application.answers.school).toBe('UC Berkeley')
  })

  it('refuses to submit an incomplete application and names the fields', async () => {
    const created = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }

    const response = await call(`/api/applications/${application.id}/submit`, {
      method: 'POST',
      cookie,
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { fields: Record<string, string> } }
    expect(Object.keys(body.error.fields).length).toBeGreaterThan(0)
  })

  it('submits a complete application and records the transition', async () => {
    const created = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }

    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ answers: validHackerAnswers }),
    })
    const submitted = await call(`/api/applications/${application.id}/submit`, {
      method: 'POST',
      cookie,
    })
    expect(submitted.status).toBe(200)

    const events = await env.DB.prepare(
      'select to_status from status_events where application_id = ? order by id',
    )
      .bind(application.id)
      .all()
    expect(events.results.map((e) => e.to_status)).toEqual(['draft', 'submitted'])
  })

  it('locks the form once submitted', async () => {
    const created = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }
    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ answers: validHackerAnswers }),
    })
    await call(`/api/applications/${application.id}/submit`, { method: 'POST', cookie })

    const edit = await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ answers: { school: 'Somewhere else' } }),
    })
    expect(edit.status).toBe(409)

    const resubmit = await call(`/api/applications/${application.id}/submit`, {
      method: 'POST',
      cookie,
    })
    expect(resubmit.status).toBe(409)
  })

  it('hides one applicant’s application from another', async () => {
    const created = await call('/api/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }

    const other = await signUp(uniqueEmail())
    const response = await call(`/api/applications/${application.id}`, { cookie: other.cookie })
    // 404 rather than 403: a different code would confirm the row exists.
    expect(response.status).toBe(404)

    const edit = await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie: other.cookie,
      body: JSON.stringify({ answers: { school: 'Hijacked' } }),
    })
    expect(edit.status).toBe(404)
  })
})

describe('organizer authorization', () => {
  it('refuses every admin route to an applicant', async () => {
    const { cookie } = await signUp(uniqueEmail())
    for (const path of [
      '/api/admin/stats',
      '/api/admin/applications',
      '/api/admin/queue',
      '/api/admin/calibration',
      '/api/admin/applications.csv',
    ]) {
      const response = await call(path, { cookie })
      expect(response.status, path).toBe(403)
    }
  })

  it('refuses every admin route to an anonymous caller', async () => {
    for (const path of ['/api/admin/stats', '/api/admin/queue']) {
      const response = await call(path)
      expect(response.status, path).toBe(401)
    }
  })

  it('refuses an applicant trying to decide an application', async () => {
    const applicant = await signUp(uniqueEmail())
    const created = await call('/api/applications', {
      method: 'POST',
      cookie: applicant.cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }

    const response = await call(`/api/admin/applications/${application.id}/status`, {
      method: 'PATCH',
      cookie: applicant.cookie,
      body: JSON.stringify({ status: 'accepted' }),
    })
    expect(response.status).toBe(403)
  })

  it('lets an organizer through', async () => {
    const organizer = await signUp(uniqueEmail())
    await promote(organizer.id)
    // Re-authenticate so the session reflects the new role.
    const response = await call('/api/admin/stats', { cookie: organizer.cookie })
    expect(response.status).toBe(200)
  })
})

describe('review flow', () => {
  async function submittedApplication() {
    const applicant = await signUp(uniqueEmail())
    const created = await call('/api/applications', {
      method: 'POST',
      cookie: applicant.cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }
    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie: applicant.cookie,
      body: JSON.stringify({ answers: validHackerAnswers }),
    })
    await call(`/api/applications/${application.id}/submit`, {
      method: 'POST',
      cookie: applicant.cookie,
    })
    return { id: application.id, applicant }
  }

  async function organizer() {
    const user = await signUp(uniqueEmail())
    await promote(user.id)
    return user
  }

  it('redacts identity on the server when blind mode is on', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()

    const response = await call(`/api/admin/applications/${id}`, { cookie: org.cookie })
    const body = (await response.json()) as {
      application: { applicantName: string | null; answers: Record<string, unknown>; alias: string }
    }

    expect(body.application.applicantName).toBeNull()
    expect(body.application.answers.firstName).toBeUndefined()
    expect(body.application.answers.github).toBeUndefined()
    // The content a reviewer is meant to judge survives.
    expect(body.application.answers.whyNotCalHacks).toBeTruthy()
    expect(body.application.alias).toMatch(/^[0-9A-F]{4}$/)
  })

  it('reveals identity only when asked', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()

    const response = await call(`/api/admin/applications/${id}?blind=0`, { cookie: org.cookie })
    const body = (await response.json()) as { application: { applicantName: string | null } }
    expect(body.application.applicantName).toBeTruthy()
  })

  it('moves an application to under review on its first review', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()

    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 4, passion: 4, fit: 4 }),
    })

    const row = await env.DB.prepare('select status from applications where id = ?')
      .bind(id)
      .first()
    expect(row?.status).toBe('under_review')
  })

  it('updates a review in place rather than stacking a second one', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()

    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 2, passion: 2, fit: 2 }),
    })
    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 5, passion: 5, fit: 5 }),
    })

    const rows = await env.DB.prepare('select total from reviews where application_id = ?')
      .bind(id)
      .all()
    expect(rows.results).toHaveLength(1)
    expect(rows.results[0]?.total).toBe(15)
  })

  it('computes the total from the scores, so they cannot disagree', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()
    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 1, passion: 2, fit: 3 }),
    })
    const row = await env.DB.prepare('select total from reviews where application_id = ?')
      .bind(id)
      .first()
    expect(row?.total).toBe(6)
  })

  it('rejects a score outside the rubric', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()
    const response = await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 9, passion: 4, fit: 4 }),
    })
    expect(response.status).toBe(400)
  })

  it('hands out an unreviewed application before a reviewed one', async () => {
    const first = await submittedApplication()
    await submittedApplication()
    const reviewerA = await organizer()
    const reviewerB = await organizer()

    // Give the first application a review so it is no longer the least read.
    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: reviewerA.cookie,
      body: JSON.stringify({ applicationId: first.id, technical: 3, passion: 3, fit: 3 }),
    })

    const response = await call('/api/admin/queue', { cookie: reviewerB.cookie })
    const body = (await response.json()) as { application: { id: string } | null }
    expect(body.application).not.toBeNull()

    // The property that matters is coverage: while anything is unread, a
    // reviewer is never handed something that already has a review. Asserting
    // a specific id would only hold in an empty pool.
    expect(body.application?.id).not.toBe(first.id)
    const chosen = await env.DB.prepare(
      'select count(*) as n from reviews where application_id = ?',
    )
      .bind(body.application?.id)
      .first<{ n: number }>()
    expect(chosen?.n).toBe(0)
  })

  it('orders by submission time among equally-reviewed applications', async () => {
    const reviewer = await organizer()
    const response = await call('/api/admin/queue', { cookie: reviewer.cookie })
    const body = (await response.json()) as { application: { id: string } | null }
    if (!body.application) return

    const chosen = await env.DB.prepare(
      `select a.submitted_at,
              (select count(*) from reviews r where r.application_id = a.id) as reviews
         from applications a where a.id = ?`,
    )
      .bind(body.application.id)
      .first<{ submitted_at: number; reviews: number }>()

    // Nothing reviewable may be both less reviewed and, at the same count,
    // older than what the queue handed out.
    const better = await env.DB.prepare(
      `select count(*) as n from applications a
        where a.status in ('submitted','under_review')
          and ( (select count(*) from reviews r where r.application_id = a.id) < ?
             or ((select count(*) from reviews r where r.application_id = a.id) = ?
                 and a.submitted_at < ?) )`,
    )
      .bind(chosen?.reviews ?? 0, chosen?.reviews ?? 0, chosen?.submitted_at ?? 0)
      .first<{ n: number }>()
    expect(better?.n).toBe(0)
  })

  it('never hands an organizer an application they already reviewed', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()

    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 3, passion: 3, fit: 3 }),
    })

    const response = await call('/api/admin/queue', { cookie: org.cookie })
    const body = (await response.json()) as { application: { id: string } | null }
    expect(body.application?.id).not.toBe(id)
  })

  it('reports calibration for the signed-in reviewer', async () => {
    const { id } = await submittedApplication()
    const org = await organizer()
    await call('/api/admin/reviews', {
      method: 'POST',
      cookie: org.cookie,
      body: JSON.stringify({ applicationId: id, technical: 5, passion: 5, fit: 5 }),
    })

    const response = await call('/api/admin/calibration', { cookie: org.cookie })
    const body = (await response.json()) as { calibration: { myAverage: number; myCount: number } }
    expect(body.calibration.myAverage).toBe(15)
    expect(body.calibration.myCount).toBe(1)
  })
})

describe('decisions', () => {
  it('records the transition and shows it on the applicant timeline', async () => {
    const applicant = await signUp(uniqueEmail())
    const created = await call('/api/applications', {
      method: 'POST',
      cookie: applicant.cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }
    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie: applicant.cookie,
      body: JSON.stringify({ answers: validHackerAnswers }),
    })
    await call(`/api/applications/${application.id}/submit`, {
      method: 'POST',
      cookie: applicant.cookie,
    })

    const org = await signUp(uniqueEmail())
    await promote(org.id)
    const decided = await call(`/api/admin/applications/${application.id}/status`, {
      method: 'PATCH',
      cookie: org.cookie,
      body: JSON.stringify({ status: 'accepted' }),
    })
    expect(decided.status).toBe(200)

    const mine = await call('/api/applications', { cookie: applicant.cookie })
    const body = (await mine.json()) as {
      applications: { status: string; events: { toStatus: string }[] }[]
    }
    expect(body.applications[0]?.status).toBe('accepted')
    expect(body.applications[0]?.events.map((e) => e.toStatus)).toEqual([
      'draft',
      'submitted',
      'accepted',
    ])
  })

  it('refuses a transition the status machine does not allow', async () => {
    const applicant = await signUp(uniqueEmail())
    const created = await call('/api/applications', {
      method: 'POST',
      cookie: applicant.cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }

    const org = await signUp(uniqueEmail())
    await promote(org.id)
    // The application is still a draft, so it cannot be accepted.
    const response = await call(`/api/admin/applications/${application.id}/status`, {
      method: 'PATCH',
      cookie: org.cookie,
      body: JSON.stringify({ status: 'accepted' }),
    })
    expect(response.status).toBe(409)
  })

  it('never exposes an unsubmitted application’s answers to an organizer', async () => {
    const applicant = await signUp(uniqueEmail())
    const created = await call('/api/applications', {
      method: 'POST',
      cookie: applicant.cookie,
      body: JSON.stringify({ type: 'hacker' }),
    })
    const { application } = (await created.json()) as { application: { id: string } }
    await call(`/api/applications/${application.id}`, {
      method: 'PATCH',
      cookie: applicant.cookie,
      body: JSON.stringify({ answers: { whyNotCalHacks: 'A private thought.' } }),
    })

    const org = await signUp(uniqueEmail())
    await promote(org.id)
    const response = await call(`/api/admin/applications/${application.id}`, { cookie: org.cookie })
    const body = (await response.json()) as { application: { answers: Record<string, unknown> } }
    expect(body.application.answers.whyNotCalHacks).toBeUndefined()
  })
})

describe('rate limiting', () => {
  it('stops a single address from grinding through signups', async () => {
    const ip = `probe-${crypto.randomUUID()}`
    let blocked = false
    // The signup limit is 20 per hour per address.
    for (let i = 0; i < 24; i++) {
      const response = await call('/api/auth/signup', {
        method: 'POST',
        ip,
        body: JSON.stringify({
          email: uniqueEmail(),
          password: 'hunter2hunter2',
          fullName: 'Flood',
        }),
      })
      if (response.status === 429) {
        blocked = true
        break
      }
    }
    expect(blocked).toBe(true)
  })

  it('stops password guessing against one account', async () => {
    const email = uniqueEmail()
    await call('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'hunter2hunter2', fullName: 'Target' }),
    })

    let blocked = false
    // Ten attempts per email per fifteen minutes, regardless of source address.
    for (let i = 0; i < 14; i++) {
      const response = await call('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: `wrong-guess-${i}` }),
      })
      if (response.status === 429) {
        blocked = true
        break
      }
    }
    expect(blocked).toBe(true)
  })
})

describe('misc', () => {
  it('answers a health check', async () => {
    const response = await call('/api/health')
    expect(response.status).toBe(200)
  })

  it('returns a structured 404 for an unknown route', async () => {
    const response = await call('/api/nope')
    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('not_found')
  })

  it('never lets a shared cache store a per-user response', async () => {
    const { cookie } = await signUp(uniqueEmail())
    const response = await call('/api/applications', { cookie })
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })
})
