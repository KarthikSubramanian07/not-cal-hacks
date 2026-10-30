import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APPLICATION_STATUSES, APPLICATION_TYPES, USER_ROLES } from '../shared/constants'

const drizzleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'drizzle')

interface Journal {
  entries: { idx: number; tag: string }[]
}

interface Snapshot {
  id: string
  prevId: string
  tables: Record<string, { checkConstraints: Record<string, { name: string; value: string }> }>
}

const journal = JSON.parse(
  readFileSync(path.join(drizzleDir, 'meta', '_journal.json'), 'utf8'),
) as Journal

const snapshotPath = (idx: number) =>
  path.join(drizzleDir, 'meta', `${String(idx).padStart(4, '0')}_snapshot.json`)

const readSnapshot = (idx: number) =>
  JSON.parse(readFileSync(snapshotPath(idx), 'utf8')) as Snapshot

/** The quoted values inside a `col in ('a', 'b')` check, in order. */
const listedValues = (check: string) => [...check.matchAll(/'([^']*)'/g)].map((m) => m[1])

// drizzle-kit diffs the schema against the newest snapshot, not the SQL files.
// 0001_judge.sql once shipped without a snapshot, so every later generate tried
// to rebuild `applications` back to a check production already had. The full
// drizzle-kit comparison runs in CI as `npm run db:check`; these are the cheap
// structural invariants that would have caught that on every test run.
describe('drizzle migration history', () => {
  it('has a SQL file and a snapshot for every journal entry', () => {
    for (const entry of journal.entries) {
      expect(existsSync(path.join(drizzleDir, `${entry.tag}.sql`)), entry.tag).toBe(true)
      expect(existsSync(snapshotPath(entry.idx)), `${entry.tag} snapshot`).toBe(true)
    }
  })

  it('chains each snapshot to the one before it', () => {
    journal.entries.forEach((entry, i) => {
      const prev = i === 0 ? '00000000-0000-0000-0000-000000000000' : readSnapshot(i - 1).id
      expect(readSnapshot(entry.idx).prevId, entry.tag).toBe(prev)
    })
  })

  it('records the current enum checks in the newest snapshot', () => {
    const latest = readSnapshot(journal.entries.at(-1)!.idx)
    const check = (table: string, name: string) =>
      listedValues(latest.tables[table].checkConstraints[name].value)

    expect(check('applications', 'applications_type_check')).toEqual([...APPLICATION_TYPES])
    expect(check('applications', 'applications_status_check')).toEqual([...APPLICATION_STATUSES])
    expect(check('users', 'users_role_check')).toEqual([...USER_ROLES])
  })
})
