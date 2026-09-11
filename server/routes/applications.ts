import { and, asc, eq, inArray } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import type { ApplicationSummary, ApplicationWithTimeline, StatusEvent } from '../../shared/api'
import { APPLICATION_TYPES } from '../../shared/constants'
import { answersSchemaFor, draftAnswersSchemaFor, fieldErrors } from '../../shared/schemas'
import { getDb, newId, schema } from '../db'
import { ApiError } from '../lib/errors'
import { parseBody } from '../lib/validate'
import { currentUser, requireUser } from '../middleware/auth'
import type { AppEnv } from '../types'

const applications = new Hono<AppEnv>()

applications.use('*', requireUser)

const toSummary = (row: typeof schema.applications.$inferSelect): ApplicationSummary => ({
  id: row.id,
  type: row.type,
  status: row.status,
  answers: row.answers,
  submittedAt: row.submittedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

/** Loads an application and refuses it unless the caller owns it. */
async function ownedApplication(c: Context<AppEnv>, id: string) {
  const user = currentUser(c)
  const row = await getDb(c.env.DB)
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.id, id))
    .get()

  // Same 404 for "does not exist" and "belongs to someone else": a different
  // status code here would turn the endpoint into an existence oracle.
  if (!row || row.userId !== user.id) throw ApiError.notFound('No such application.')
  return row
}

/** Every application belonging to the signed-in user, with its timeline. */
applications.get('/', async (c) => {
  const user = currentUser(c)
  const db = getDb(c.env.DB)

  const rows = await db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.userId, user.id))
    .orderBy(asc(schema.applications.createdAt))
    .all()

  if (rows.length === 0) return c.json({ applications: [] as ApplicationWithTimeline[] })

  const events = await db
    .select({
      id: schema.statusEvents.id,
      applicationId: schema.statusEvents.applicationId,
      fromStatus: schema.statusEvents.fromStatus,
      toStatus: schema.statusEvents.toStatus,
      createdAt: schema.statusEvents.createdAt,
    })
    .from(schema.statusEvents)
    .where(
      inArray(
        schema.statusEvents.applicationId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(schema.statusEvents.id))
    .all()

  const byApplication = new Map<string, StatusEvent[]>()
  for (const e of events) {
    const list = byApplication.get(e.applicationId) ?? []
    list.push({ id: e.id, fromStatus: e.fromStatus, toStatus: e.toStatus, createdAt: e.createdAt })
    byApplication.set(e.applicationId, list)
  }

  return c.json({
    applications: rows.map((row) => ({
      ...toSummary(row),
      events: byApplication.get(row.id) ?? [],
    })) satisfies ApplicationWithTimeline[],
  })
})

/**
 * Starts (or returns) the draft for a type.
 *
 * Deliberately idempotent: clicking "Apply as a hacker" twice, or opening the
 * form in two tabs, must not create a second application or throw.
 */
applications.post('/', async (c) => {
  const user = currentUser(c)
  const { type } = await parseBody(c, z.object({ type: z.enum(APPLICATION_TYPES) }))
  const db = getDb(c.env.DB)

  const existing = await db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, user.id), eq(schema.applications.type, type)))
    .get()
  if (existing) return c.json({ application: toSummary(existing) })

  const id = newId()
  const now = Date.now()
  await db.batch([
    db
      .insert(schema.applications)
      .values({ id, userId: user.id, type, status: 'draft', answers: {}, createdAt: now, updatedAt: now }),
    db
      .insert(schema.statusEvents)
      .values({ applicationId: id, fromStatus: null, toStatus: 'draft', actorId: user.id, createdAt: now }),
  ])

  const created = await db.select().from(schema.applications).where(eq(schema.applications.id, id)).get()
  if (!created) throw ApiError.notFound('No such application.')
  return c.json({ application: toSummary(created) }, 201)
})

applications.get('/:id', async (c) => {
  const row = await ownedApplication(c, c.req.param('id'))
  return c.json({ application: toSummary(row) })
})

/**
 * Autosave. Called on a debounce while someone types, so it must be cheap,
 * idempotent, and tolerant of half-finished answers.
 */
applications.patch('/:id', async (c) => {
  const row = await ownedApplication(c, c.req.param('id'))
  if (row.status !== 'draft') {
    throw ApiError.conflict('This application has been submitted and can no longer be edited.')
  }

  const { answers } = await parseBody(
    c,
    z.object({ answers: draftAnswersSchemaFor(row.type) }),
  )

  const now = Date.now()
  await getDb(c.env.DB)
    .update(schema.applications)
    // Merge rather than replace: a section-at-a-time save must not wipe answers
    // the client did not send.
    .set({ answers: { ...row.answers, ...answers }, updatedAt: now })
    .where(eq(schema.applications.id, row.id))

  return c.json({ savedAt: now })
})

applications.post('/:id/submit', async (c) => {
  const user = currentUser(c)
  const row = await ownedApplication(c, c.req.param('id'))
  if (row.status !== 'draft') {
    throw ApiError.conflict('This application has already been submitted.')
  }

  // The strict schema runs here, on the server, against whatever is actually
  // stored. Passing the client's copy of the answers would let a crafted
  // request submit an application the form would have rejected.
  const parsed = answersSchemaFor(row.type).safeParse(row.answers)
  if (!parsed.success) {
    throw ApiError.badRequest(
      'A few answers still need work before this can go in.',
      fieldErrors(parsed.error),
    )
  }

  const now = Date.now()
  const db = getDb(c.env.DB)
  await db.batch([
    db
      .update(schema.applications)
      .set({ status: 'submitted', submittedAt: now, updatedAt: now, answers: parsed.data })
      .where(and(eq(schema.applications.id, row.id), eq(schema.applications.status, 'draft'))),
    // Written in the same batch as the status change. D1 runs a batch as one
    // transaction, so the audit trail cannot drift from the row it describes.
    db.insert(schema.statusEvents).values({
      applicationId: row.id,
      fromStatus: 'draft',
      toStatus: 'submitted',
      actorId: user.id,
      createdAt: now,
    }),
  ])

  return c.json({ status: 'submitted', submittedAt: now })
})

export default applications
