import { getTableColumns, getTableName } from 'drizzle-orm'
import type { ApplicationStatus } from '../../shared/constants'
import { applications, statusEvents, type ApplicationRow } from './schema'

/*
 * Moving an application's status is one operation, not two.
 *
 * Every status change has to append an audit row and update the application in
 * the same breath, and has to be safe when two requests arrive at once: two
 * tabs submitting, two organizers deciding, two reviewers scoring the first
 * review. This module is the single place that knows how to do that, so the
 * three call sites cannot drift apart.
 *
 * Physical column and table names are read back out of the drizzle schema
 * rather than typed as string literals, so renaming a field in `schema.ts`
 * fails the build here instead of at runtime in production.
 */

const app = getTableColumns(applications)
const evt = getTableColumns(statusEvents)
const APPLICATIONS = getTableName(applications)
const STATUS_EVENTS = getTableName(statusEvents)

/** Application columns a transition may write alongside the status. */
type Extras = Partial<Pick<ApplicationRow, 'submittedAt' | 'answers'>>

export type StatusTransition = {
  applicationId: string
  /** The status this request read. The write only lands if it is still true. */
  from: ApplicationStatus
  to: ApplicationStatus
  actorId: string
  at: number
  also?: Extras
}

/**
 * Builds the statement pair for a status change. Pass the result straight to
 * `DB.batch`, which runs it as one transaction.
 *
 * The audit insert comes first and is guarded on the pre-update status; the
 * update then consumes that same status. Concurrent requests therefore
 * serialize: the first sees `from` and writes both rows, the second sees the
 * new status and matches nothing at all. Guarding on a timestamp instead would
 * not work, because two requests in the same millisecond share one.
 */
export function transitionStatus(d1: D1Database, t: StatusTransition): D1PreparedStatement[] {
  const extras = Object.entries(t.also ?? {}) as [keyof Extras, unknown][]

  const assignments = [
    `${app.status.name} = ?`,
    `${app.updatedAt.name} = ?`,
    ...extras.map(([key]) => `${app[key].name} = ?`),
  ].join(', ')

  // `answers` is a json column, so it crosses the driver boundary as text. The
  // other extras are already scalars.
  const values = [
    t.to,
    t.at,
    ...extras.map(([, value]) =>
      value !== null && typeof value === 'object' ? JSON.stringify(value) : value,
    ),
  ]

  return [
    d1
      .prepare(
        `insert into ${STATUS_EVENTS} (${evt.applicationId.name}, ${evt.fromStatus.name}, ${evt.toStatus.name}, ${evt.actorId.name}, ${evt.createdAt.name})
         select ?, ?, ?, ?, ?
          where exists (select 1 from ${APPLICATIONS} where ${app.id.name} = ? and ${app.status.name} = ?)`,
      )
      .bind(t.applicationId, t.from, t.to, t.actorId, t.at, t.applicationId, t.from),
    d1
      .prepare(
        `update ${APPLICATIONS} set ${assignments} where ${app.id.name} = ? and ${app.status.name} = ?`,
      )
      .bind(...values, t.applicationId, t.from),
  ]
}
