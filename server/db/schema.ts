import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  SCORE_MAX,
  SCORE_MIN,
  USER_ROLES,
} from '../../shared/constants'
import type { DraftAnswers } from '../../shared/schemas'

const now = sql`(unixepoch() * 1000)`

/**
 * Renders `col in ('a','b')` from the shared constant lists.
 *
 * SQLite has no enum type, so the allowed values are pinned with CHECK
 * constraints generated from the same arrays the Zod schemas use. A bug in a
 * handler cannot write a status the product does not have.
 */
const inList = (column: unknown, values: readonly string[]) =>
  sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(', '))})`

/** Score bounds inlined as literals: DDL cannot carry bound parameters. */
const scoreRange = (column: unknown) =>
  sql`${column} between ${sql.raw(String(SCORE_MIN))} and ${sql.raw(String(SCORE_MAX))}`

/**
 * `role` is who you are in the system. `applications.type` is what you are
 * applying as. They are deliberately orthogonal: an organizer can also hold a
 * judge application, and promoting someone to organizer never touches their
 * applications.
 *
 * Organizers are promoted out of band (see `scripts/seed.ts`), never by a
 * self-service route, because a self-service path to `organizer` is a self
 * service path to every applicant's essay.
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    role: text('role', { enum: USER_ROLES }).notNull().default('applicant'),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    check('users_role_check', inList(t.role, USER_ROLES)),
  ],
)

/**
 * Sessions store a SHA-256 hash of the cookie value, never the value itself, so
 * a leaked database still cannot be used to impersonate anyone.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expiry_idx').on(t.expiresAt)],
)

export const applications = sqliteTable(
  'applications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: APPLICATION_TYPES }).notNull(),
    status: text('status', { enum: APPLICATION_STATUSES }).notNull().default('draft'),
    answers: text('answers', { mode: 'json' }).notNull().$type<DraftAnswers>().default({}),
    submittedAt: integer('submitted_at'),
    createdAt: integer('created_at').notNull().default(now),
    updatedAt: integer('updated_at').notNull().default(now),
  },
  (t) => [
    // One application per person per type. The database enforces it rather than
    // the handler, because two tabs can submit at the same millisecond.
    uniqueIndex('applications_user_type_unique').on(t.userId, t.type),
    index('applications_status_idx').on(t.status),
    index('applications_submitted_idx').on(t.submittedAt),
    check('applications_type_check', inList(t.type, APPLICATION_TYPES)),
    check('applications_status_check', inList(t.status, APPLICATION_STATUSES)),
    // A submitted application must carry a submission time, and a draft must not.
    check(
      'applications_submitted_at_check',
      sql`(${t.status} = 'draft') = (${t.submittedAt} is null)`,
    ),
  ],
)

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    technical: integer('technical').notNull(),
    passion: integer('passion').notNull(),
    fit: integer('fit').notNull(),
    // Stored generated column: the total can never disagree with its parts, and
    // the queue can sort on it without recomputing in application code.
    total: integer('total').generatedAlwaysAs(
      (): ReturnType<typeof sql> => sql`technical + passion + fit`,
      { mode: 'stored' },
    ),
    comment: text('comment'),
    createdAt: integer('created_at').notNull().default(now),
    updatedAt: integer('updated_at').notNull().default(now),
  },
  (t) => [
    // One review per organizer per application; re-scoring updates in place.
    uniqueIndex('reviews_application_reviewer_unique').on(t.applicationId, t.reviewerId),
    index('reviews_application_idx').on(t.applicationId),
    index('reviews_reviewer_idx').on(t.reviewerId),
    check('reviews_technical_check', scoreRange(t.technical)),
    check('reviews_passion_check', scoreRange(t.passion)),
    check('reviews_fit_check', scoreRange(t.fit)),
  ],
)

/**
 * Append-only audit trail. Powers the applicant's timeline and answers
 * "who decided this, and when" for the organizers.
 */
export const statusEvents = sqliteTable(
  'status_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status', { enum: APPLICATION_STATUSES }),
    toStatus: text('to_status', { enum: APPLICATION_STATUSES }).notNull(),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [
    index('status_events_application_idx').on(t.applicationId, t.id),
    check('status_events_to_check', inList(t.toStatus, APPLICATION_STATUSES)),
    check(
      'status_events_from_check',
      sql`${t.fromStatus} is null or ${inList(t.fromStatus, APPLICATION_STATUSES)}`,
    ),
  ],
)

/**
 * Fixed-window counters for auth rate limiting. Rows are self-expiring by
 * comparison against `reset_at`; a stale row is simply overwritten on next use.
 */
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  resetAt: integer('reset_at').notNull(),
})

export type UserRow = typeof users.$inferSelect
export type ApplicationRow = typeof applications.$inferSelect
export type ReviewRecord = typeof reviews.$inferSelect
export type StatusEventRow = typeof statusEvents.$inferSelect
export type RateLimitRow = typeof rateLimits.$inferSelect
