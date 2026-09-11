import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type {
  AdminApplicationDetail,
  AdminApplicationRow,
  AdminStats,
  Calibration,
  ReviewRow,
} from '../../shared/api'
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type ApplicationType,
} from '../../shared/constants'
import { applicationFiltersSchema, decisionSchema, reviewInputSchema } from '../../shared/schemas'
import { canTransition } from '../../shared/transitions'
import { getDb, newId, schema, transitionStatus, type Db } from '../db'
import { aliasFor, displayName, redactAnswers } from '../lib/blind'
import { ApiError } from '../lib/errors'
import { parseBody, parseQuery } from '../lib/validate'
import { currentUser, requireOrganizer } from '../middleware/auth'
import type { AppEnv } from '../types'
import type { DraftAnswers } from '../../shared/schemas'

const admin = new Hono<AppEnv>()

admin.use('*', requireOrganizer)

/** Blind mode is the default. It has to be asked *out* of, never into. */
const wantsBlind = (c: { req: { query: (k: string) => string | undefined } }) =>
  c.req.query('blind') !== '0'

/**
 * Organizers can see that a draft exists, but not what it says.
 *
 * Seeing the shape of the funnel is legitimate. Reading an essay that its
 * author has not chosen to hand in is not, so unsubmitted answers never leave
 * the database.
 */
const DRAFT_HIDDEN: DraftAnswers = {}

async function loadCalibration(db: Db, reviewerId: string): Promise<Calibration> {
  const rows = await db.all<{
    my_avg: number | null
    my_count: number
    team_avg: number | null
    team_count: number
  }>(sql`
    select
      (select avg(total) from reviews where reviewer_id = ${reviewerId}) as my_avg,
      (select count(*) from reviews where reviewer_id = ${reviewerId}) as my_count,
      (select avg(total) from reviews) as team_avg,
      (select count(*) from reviews) as team_count
  `)
  const r = rows[0]
  return {
    myAverage: r?.my_avg ?? null,
    teamAverage: r?.team_avg ?? null,
    myCount: r?.my_count ?? 0,
    teamCount: r?.team_count ?? 0,
  }
}

async function loadDetail(
  db: Db,
  id: string,
  viewerId: string,
  blind: boolean,
): Promise<AdminApplicationDetail> {
  const row = await db
    .select({
      id: schema.applications.id,
      type: schema.applications.type,
      status: schema.applications.status,
      answers: schema.applications.answers,
      submittedAt: schema.applications.submittedAt,
      createdAt: schema.applications.createdAt,
      updatedAt: schema.applications.updatedAt,
      userName: schema.users.fullName,
      userEmail: schema.users.email,
    })
    .from(schema.applications)
    .innerJoin(schema.users, eq(schema.users.id, schema.applications.userId))
    .where(eq(schema.applications.id, id))
    .get()

  if (!row) throw ApiError.notFound('No such application.')

  const reviewRows = await db
    .select({
      id: schema.reviews.id,
      reviewerId: schema.reviews.reviewerId,
      reviewerName: schema.users.fullName,
      technical: schema.reviews.technical,
      passion: schema.reviews.passion,
      fit: schema.reviews.fit,
      total: schema.reviews.total,
      comment: schema.reviews.comment,
      createdAt: schema.reviews.createdAt,
    })
    .from(schema.reviews)
    .innerJoin(schema.users, eq(schema.users.id, schema.reviews.reviewerId))
    .where(eq(schema.reviews.applicationId, id))
    .all()

  const reviews: ReviewRow[] = reviewRows.map((r) => ({ ...r, total: r.total ?? 0 }))
  const isDraft = row.status === 'draft'
  const answers = isDraft ? DRAFT_HIDDEN : row.answers

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    alias: aliasFor(row.id),
    blinded: blind,
    applicantName: blind ? null : displayName(row.answers, row.userName),
    applicantEmail: blind ? null : row.userEmail,
    answers: blind ? redactAnswers(answers, row.type) : answers,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviews,
    myReview: reviews.find((r) => r.reviewerId === viewerId) ?? null,
  }
}

admin.get('/stats', async (c) => {
  const db = getDb(c.env.DB)

  const totals = await db.all<{
    total_submitted: number
    awaiting_review: number
    reviewed: number
    decided: number
  }>(sql`
    select
      (select count(*) from applications where status <> 'draft') as total_submitted,
      (select count(*) from applications a
        where a.status in ('submitted','under_review')
          and not exists (select 1 from reviews r where r.application_id = a.id)) as awaiting_review,
      (select count(*) from applications a
        where a.status in ('submitted','under_review')
          and exists (select 1 from reviews r where r.application_id = a.id)) as reviewed,
      (select count(*) from applications
        where status in ('accepted','waitlisted','rejected')) as decided
  `)

  const grouped = await db.all<{ status: ApplicationStatus; n: number }>(
    sql`select status, count(*) as n from applications group by status`,
  )

  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >
  for (const g of grouped) byStatus[g.status] = g.n

  const t = totals[0]
  return c.json({
    stats: {
      totalSubmitted: t?.total_submitted ?? 0,
      awaitingReview: t?.awaiting_review ?? 0,
      reviewed: t?.reviewed ?? 0,
      decided: t?.decided ?? 0,
      byStatus,
    } satisfies AdminStats,
  })
})

const ORDER_BY = {
  submitted_desc: sql`a.submitted_at desc nulls last, a.updated_at desc`,
  submitted_asc: sql`a.submitted_at asc nulls last, a.updated_at asc`,
  score_desc: sql`avg_score desc nulls last, a.submitted_at asc`,
  score_asc: sql`avg_score asc nulls last, a.submitted_at asc`,
  reviews_asc: sql`review_count asc, a.submitted_at asc`,
} as const

async function queryRows(db: Db, filters: ReturnType<typeof applicationFiltersSchema.parse>) {
  const conditions = [sql`1 = 1`]
  if (filters.type) conditions.push(sql`a.type = ${filters.type}`)
  if (filters.status) conditions.push(sql`a.status = ${filters.status}`)
  if (filters.q) {
    const needle = `%${filters.q.toLowerCase()}%`
    // Account fields are always searchable. Anything inside `answers` is only
    // searchable once the application has been submitted, because otherwise a
    // well-chosen query would report on the contents of an unsent draft.
    conditions.push(sql`(
      lower(u.full_name) like ${needle}
      or lower(u.email) like ${needle}
      or (a.status <> 'draft' and (
        lower(coalesce(json_extract(a.answers, '$.school'), '')) like ${needle}
        or lower(coalesce(json_extract(a.answers, '$.firstName'), '')) like ${needle}
        or lower(coalesce(json_extract(a.answers, '$.lastName'), '')) like ${needle}
      ))
    )`)
  }

  return db.all<{
    id: string
    type: ApplicationType
    status: ApplicationStatus
    applicant_name: string
    applicant_email: string
    school: string
    review_count: number
    avg_score: number | null
    submitted_at: number | null
    updated_at: number
  }>(sql`
    select
      a.id,
      a.type,
      a.status,
      u.full_name as applicant_name,
      u.email as applicant_email,
      case when a.status = 'draft' then ''
           else coalesce(json_extract(a.answers, '$.school'), '') end as school,
      (select count(*) from reviews r where r.application_id = a.id) as review_count,
      (select avg(r.total) from reviews r where r.application_id = a.id) as avg_score,
      a.submitted_at,
      a.updated_at
    from applications a
    join users u on u.id = a.user_id
    where ${sql.join(conditions, sql` and `)}
    order by ${ORDER_BY[filters.sort]}
    limit ${filters.limit} offset ${filters.offset}
  `)
}

admin.get('/applications', async (c) => {
  const filters = parseQuery(c, applicationFiltersSchema)
  const rows = await queryRows(getDb(c.env.DB), filters)

  return c.json({
    applications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      applicantName: r.applicant_name,
      applicantEmail: r.applicant_email,
      school: r.school,
      reviewCount: r.review_count,
      avgScore: r.avg_score,
      submittedAt: r.submitted_at,
      updatedAt: r.updated_at,
    })) satisfies AdminApplicationRow[],
  })
})

/** CSV of the current filter selection, for the spreadsheet half of the team. */
admin.get('/applications.csv', async (c) => {
  const filters = parseQuery(c, applicationFiltersSchema)
  const rows = await queryRows(getDb(c.env.DB), { ...filters, limit: 1000, offset: 0 })

  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = [
    'id',
    'name',
    'email',
    'type',
    'school',
    'status',
    'reviews',
    'avg_score',
    'submitted_at',
  ]
  const body = rows.map((r) =>
    [
      r.id,
      r.applicant_name,
      r.applicant_email,
      r.type,
      r.school,
      r.status,
      r.review_count,
      r.avg_score === null ? '' : r.avg_score.toFixed(2),
      r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
    ]
      .map(escape)
      .join(','),
  )

  return c.body([header.join(','), ...body].join('\n'), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="not-cal-hacks-applications.csv"`,
  })
})

admin.get('/applications/:id', async (c) => {
  const user = currentUser(c)
  const detail = await loadDetail(getDb(c.env.DB), c.req.param('id'), user.id, wantsBlind(c))
  return c.json({ application: detail })
})

admin.patch('/applications/:id/status', async (c) => {
  const user = currentUser(c)
  const db = getDb(c.env.DB)
  const { status } = await parseBody(c, decisionSchema)

  const row = await db
    .select({ id: schema.applications.id, status: schema.applications.status })
    .from(schema.applications)
    .where(eq(schema.applications.id, c.req.param('id')))
    .get()
  if (!row) throw ApiError.notFound('No such application.')

  if (row.status === status) return c.json({ status })
  if (!canTransition(row.status, status)) {
    throw ApiError.conflict(`An application cannot go from ${row.status} to ${status}.`)
  }

  const now = Date.now()

  // Two organizers deciding at once serialize here: the second one finds the
  // status it read already gone and writes neither a duplicate audit row nor a
  // lost update.
  await c.env.DB.batch(
    transitionStatus(c.env.DB, {
      applicationId: row.id,
      from: row.status,
      to: status,
      actorId: user.id,
      at: now,
    }),
  )

  return c.json({ status })
})

admin.get('/calibration', async (c) => {
  const user = currentUser(c)
  return c.json({ calibration: await loadCalibration(getDb(c.env.DB), user.id) })
})

/**
 * The review queue.
 *
 * Ordering by review count first is the whole point: left to themselves,
 * reviewers all open the top of the list and the same twenty applications get
 * five reads while the tail gets none. Handing out the least-reviewed
 * application spreads coverage evenly without anyone thinking about it.
 */
admin.get('/queue', async (c) => {
  const user = currentUser(c)
  const db = getDb(c.env.DB)
  const blind = wantsBlind(c)

  const pending = sql`
    from applications a
    where a.status in ('submitted','under_review')
      and not exists (
        select 1 from reviews r
        where r.application_id = a.id and r.reviewer_id = ${user.id}
      )
  `

  const [nextRows, remainingRows, calibration] = await Promise.all([
    db.all<{ id: string }>(sql`
      select a.id ${pending}
      order by (select count(*) from reviews r2 where r2.application_id = a.id) asc,
               a.submitted_at asc
      limit 1
    `),
    db.all<{ n: number }>(sql`select count(*) as n ${pending}`),
    loadCalibration(db, user.id),
  ])

  const nextId = nextRows[0]?.id
  return c.json({
    application: nextId ? await loadDetail(db, nextId, user.id, blind) : null,
    remaining: remainingRows[0]?.n ?? 0,
    calibration,
  })
})

admin.post('/reviews', async (c) => {
  const user = currentUser(c)
  const db = getDb(c.env.DB)
  const input = await parseBody(c, reviewInputSchema)

  const application = await db
    .select({ id: schema.applications.id, status: schema.applications.status })
    .from(schema.applications)
    .where(eq(schema.applications.id, input.applicationId))
    .get()
  if (!application) throw ApiError.notFound('No such application.')
  if (application.status === 'draft') {
    throw ApiError.conflict('That application has not been submitted yet.')
  }

  const now = Date.now()
  await db
    .insert(schema.reviews)
    .values({
      id: newId(),
      applicationId: input.applicationId,
      reviewerId: user.id,
      technical: input.technical,
      passion: input.passion,
      fit: input.fit,
      comment: input.comment ?? null,
      createdAt: now,
      updatedAt: now,
    })
    // Re-scoring updates in place rather than stacking duplicate reviews.
    .onConflictDoUpdate({
      target: [schema.reviews.applicationId, schema.reviews.reviewerId],
      set: {
        technical: input.technical,
        passion: input.passion,
        fit: input.fit,
        comment: input.comment ?? null,
        updatedAt: now,
      },
    })

  // The first review on a submitted application moves it to under_review, so
  // the applicant's timeline reflects reality without anyone pressing a button.
  // Two reviewers landing the first review together is the same race as any
  // other transition, and gets the same guarantee.
  if (application.status === 'submitted') {
    await c.env.DB.batch(
      transitionStatus(c.env.DB, {
        applicationId: application.id,
        from: 'submitted',
        to: 'under_review',
        actorId: user.id,
        at: now,
      }),
    )
  }

  return c.json({ ok: true, calibration: await loadCalibration(db, user.id) })
})

export default admin
