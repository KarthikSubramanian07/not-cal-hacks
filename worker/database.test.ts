import { env, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { DurableDatabase } from '../server/db/durable'
import { MIGRATIONS } from './migrations.generated'

/**
 * The adapter and the object together, against real SQLite inside workerd.
 * These pin the promises the rest of the app leans on: the D1 call shapes, and
 * above all that a batch is one transaction.
 */

const db = new DurableDatabase(env.DATABASE)

let n = 0
const user = (overrides: Partial<{ id: string; email: string }> = {}) => {
  const id = overrides.id ?? `u-${n++}-${crypto.randomUUID()}`
  return db
    .prepare('insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)')
    .bind(id, overrides.email ?? `${id}@example.edu`, 'hash', 'Test User')
}

const countUsers = () => db.prepare('select count(*) as n from users').first<number>('n')

describe('schema migrations', () => {
  it('applies every compiled migration exactly once, in order', async () => {
    const applied = await db
      .prepare('select version, name from __migrations order by version')
      .all()
    expect(applied.results).toEqual(MIGRATIONS.map(({ version, name }) => ({ version, name })))
  })

  it('ends on the current schema, not an intermediate one', async () => {
    const tables = await db
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '\\_%' escape '\\' order by name",
      )
      .raw<[string]>()
    expect(tables.flat()).toEqual([
      'applications',
      'rate_limits',
      'reviews',
      'sessions',
      'status_events',
      'users',
    ])

    // 0001 rebuilt `applications` so that it accepts judges and refuses mentors.
    const definition = await db
      .prepare("select sql from sqlite_master where name = 'applications'")
      .first<string>('sql')
    expect(definition).toContain("'judge'")
    expect(definition).not.toContain("'mentor'")

    const indexes = await db
      .prepare(
        "select name from sqlite_master where type = 'index' and tbl_name = 'applications' and name not like 'sqlite_%' order by name",
      )
      .raw<[string]>()
    expect(indexes.flat()).toEqual([
      'applications_status_idx',
      'applications_submitted_idx',
      'applications_user_type_unique',
    ])
  })

  it('enforces foreign keys', async () => {
    await expect(
      db
        .prepare('insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)')
        .bind('t', 'nobody', 1)
        .run(),
    ).rejects.toThrow(/FOREIGN KEY/i)
  })
})

describe('prepared statements', () => {
  it('first() returns the first row, a single column, or null', async () => {
    await user({ id: 'first-1', email: 'first@example.edu' }).run()
    const select = db.prepare('select id, email, role from users where id = ?')

    expect(await select.bind('first-1').first()).toEqual({
      id: 'first-1',
      email: 'first@example.edu',
      role: 'applicant',
    })
    expect(await select.bind('first-1').first('email')).toBe('first@example.edu')
    expect(await select.bind('missing').first()).toBeNull()
    expect(await select.bind('missing').first('email')).toBeNull()
    await expect(select.bind('first-1').first('nope')).rejects.toThrow(/Column not found/)
  })

  it('all() returns rows as objects with D1-shaped metadata', async () => {
    await user({ id: 'all-1' }).run()
    await user({ id: 'all-2' }).run()
    const result = await db
      .prepare("select id from users where id like 'all-%' order by id")
      .all<{ id: string }>()

    expect(result.success).toBe(true)
    expect(result.results).toEqual([{ id: 'all-1' }, { id: 'all-2' }])
    expect(result.meta.changes).toBe(0)
    expect(result.meta.rows_read).toBeGreaterThan(0)
    expect(result.meta.size_after).toBeGreaterThan(0)
  })

  it('run() reports what a write changed', async () => {
    const first = await db
      .prepare('insert into rate_limits (key, count, reset_at) values (?, ?, ?), (?, ?, ?)')
      .bind('a', 1, 1, 'b', 1, 1)
      .run()
    expect(first.meta.changes).toBe(2)
    expect(first.meta.changed_db).toBe(true)

    const none = await db.prepare("update rate_limits set count = 9 where key = 'zzz'").run()
    expect(none.meta.changes).toBe(0)

    const returning = await db
      .prepare('update rate_limits set count = count + 1 where key = ? returning count')
      .bind('a')
      .run<{ count: number }>()
    expect(returning.results).toEqual([{ count: 2 }])
    expect(returning.meta.changes).toBe(1)
  })

  it('run() reports the rowid of an autoincrement insert', async () => {
    const owner = await user().bind('rowid-user', 'rowid@example.edu', 'h', 'n').run()
    expect(owner.success).toBe(true)
    await db
      .prepare(
        "insert into applications (id, user_id, type) values ('rowid-app', 'rowid-user', 'hacker')",
      )
      .run()
    const insert = db.prepare(
      "insert into status_events (application_id, to_status) values ('rowid-app', 'draft')",
    )
    const one = await insert.run()
    const two = await insert.run()
    expect(two.meta.last_row_id).toBe(one.meta.last_row_id + 1)
  })

  it('raw() returns positional rows and keeps duplicate column names apart', async () => {
    await user({ id: 'raw-1', email: 'raw@example.edu' }).run()
    const statement = db.prepare('select id, email, id from users where id = ?').bind('raw-1')

    expect(await statement.raw()).toEqual([['raw-1', 'raw@example.edu', 'raw-1']])
    expect(await statement.raw({ columnNames: true })).toEqual([
      ['id', 'email', 'id'],
      ['raw-1', 'raw@example.edu', 'raw-1'],
    ])
  })

  it('bind() is immutable and converts values the way D1 does', async () => {
    const select = db.prepare('select ? as a, ? as b, ? as c')
    const bound = select.bind(true, false, null)
    expect(await bound.first()).toEqual({ a: 1, b: 0, c: null })
    // The original statement is untouched and can be bound again.
    expect(await select.bind('x', 2, 3.5).first()).toEqual({ a: 'x', b: 2, c: 3.5 })

    expect(() => select.bind(undefined)).toThrow(/not supported/)
    expect(() => select.bind({})).toThrow(/not supported/)
  })

  it('round-trips blobs as byte arrays', async () => {
    const bytes = new Uint8Array([1, 2, 255])
    expect(await db.prepare('select ? as b').bind(bytes).first('b')).toEqual([1, 2, 255])
    expect(await db.prepare('select ? as b').bind(bytes.buffer).first('b')).toEqual([1, 2, 255])
  })

  it('surfaces constraint failures as rejections', async () => {
    await user({ id: 'dup-1', email: 'dup@example.edu' }).run()
    await expect(user({ id: 'dup-2', email: 'dup@example.edu' }).run()).rejects.toThrow(
      /UNIQUE constraint failed: users\.email/,
    )
  })
})

describe('batch', () => {
  it('runs every statement and returns one result each, in order', async () => {
    const results = await db.batch<{ id: string }>([
      user({ id: 'batch-1' }),
      user({ id: 'batch-2' }),
      db.prepare("select id from users where id like 'batch-%' order by id"),
    ])
    expect(results).toHaveLength(3)
    expect(results[0]?.meta.changes).toBe(1)
    expect(results[2]?.results).toEqual([{ id: 'batch-1' }, { id: 'batch-2' }])
  })

  it('rolls back every statement when a later one fails', async () => {
    const before = await countUsers()

    await expect(
      db.batch([
        user({ id: 'rollback-1' }),
        user({ id: 'rollback-2' }),
        // Violates users_role_check, after two inserts have already run.
        db.prepare("update users set role = 'emperor' where id = 'rollback-1'"),
        user({ id: 'rollback-3' }),
      ]),
    ).rejects.toThrow(/CHECK constraint failed/)

    expect(await countUsers()).toBe(before)
    expect(await db.prepare("select id from users where id like 'rollback-%'").all()).toMatchObject(
      { results: [] },
    )
  })

  it('rolls back when the failure is a unique collision inside the batch', async () => {
    const before = await countUsers()
    await expect(
      db.batch([
        user({ id: 'collide-1', email: 'collide@example.edu' }),
        user({ id: 'collide-2', email: 'collide@example.edu' }),
      ]),
    ).rejects.toThrow(/UNIQUE constraint failed/)
    expect(await countUsers()).toBe(before)
  })

  it('keeps working after a rolled-back batch', async () => {
    await expect(db.batch([db.prepare('select * from no_such_table')])).rejects.toThrow()
    await db.batch([user({ id: 'after-1' })])
    expect(await db.prepare("select id from users where id = 'after-1'").first('id')).toBe(
      'after-1',
    )
  })

  it('serializes concurrent batches, so a guarded write lands exactly once', async () => {
    await db.batch([
      user({ id: 'race-user' }),
      db.prepare(
        "insert into applications (id, user_id, type) values ('race-app', 'race-user', 'hacker')",
      ),
    ])

    // Twenty callers all try the same draft -> submitted move at once.
    const attempt = () =>
      db.batch([
        db.prepare(
          "insert into status_events (application_id, from_status, to_status) select 'race-app', 'draft', 'submitted' where exists (select 1 from applications where id = 'race-app' and status = 'draft')",
        ),
        db.prepare(
          "update applications set status = 'submitted', submitted_at = 1 where id = 'race-app' and status = 'draft'",
        ),
      ])
    const outcomes = await Promise.all(Array.from({ length: 20 }, attempt))

    expect(outcomes.filter(([, update]) => update?.meta.changes === 1)).toHaveLength(1)
    expect(
      await db
        .prepare("select count(*) as n from status_events where application_id = 'race-app'")
        .first('n'),
    ).toBe(1)
  })

  it('accepts an empty batch and rejects foreign statements', async () => {
    expect(await db.batch([])).toEqual([])
    const other = new DurableDatabase(env.DATABASE)
    await expect(db.batch([other.prepare('select 1')])).rejects.toThrow(/prepared by this database/)
  })
})

describe('exec', () => {
  it('runs a multi-statement script atomically', async () => {
    await db.exec(
      "insert into rate_limits (key, count, reset_at) values ('exec-1', 1, 1);\ninsert into rate_limits (key, count, reset_at) values ('exec-2', 1, 1);",
    )
    expect(
      await db.prepare("select count(*) as n from rate_limits where key like 'exec-%'").first('n'),
    ).toBe(2)

    await expect(
      db.exec(
        "insert into rate_limits (key, count, reset_at) values ('exec-3', 1, 1);\ninsert into rate_limits (key, count, reset_at) values ('exec-1', 1, 1);",
      ),
    ).rejects.toThrow(/UNIQUE/)
    expect(await db.prepare("select key from rate_limits where key = 'exec-3'").first()).toBeNull()
  })
})

describe('operator console', () => {
  const post = (body: unknown, token?: string) =>
    SELF.fetch('https://db.local/exec', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    })

  it('refuses a missing or wrong token', async () => {
    const body = { statements: [{ sql: 'select 1' }] }
    expect((await post(body)).status).toBe(401)
    expect((await post(body, 'wrong-token-wrong-token-wrong')).status).toBe(401)
  })

  it('serves nothing but POST /exec', async () => {
    expect((await SELF.fetch('https://db.local/')).status).toBe(404)
    expect((await SELF.fetch('https://db.local/exec')).status).toBe(404)
  })

  it('runs statements for the right token, in one transaction', async () => {
    const ok = await post(
      { statements: [{ sql: 'select ? as answer', params: [42] }] },
      env.ADMIN_TOKEN,
    )
    expect(ok.status).toBe(200)
    const { results } = (await ok.json()) as { results: { columns: string[]; rows: unknown[][] }[] }
    expect(results[0]).toMatchObject({ columns: ['answer'], rows: [[42]] })

    const failed = await post(
      {
        statements: [
          { sql: "insert into rate_limits (key, count, reset_at) values ('console-1', 1, 1)" },
          { sql: 'insert into no_such_table values (1)' },
        ],
      },
      env.ADMIN_TOKEN,
    )
    expect(failed.status).toBe(400)
    expect(
      await db.prepare("select key from rate_limits where key = 'console-1'").first(),
    ).toBeNull()
  })

  it('rejects malformed bodies', async () => {
    expect((await post({}, env.ADMIN_TOKEN)).status).toBe(400)
    expect((await post({ statements: [{ sql: 1 }] }, env.ADMIN_TOKEN)).status).toBe(400)
    expect(
      (await post({ statements: [{ sql: 'select ?', params: [{}] }] }, env.ADMIN_TOKEN)).status,
    ).toBe(400)
  })
})
