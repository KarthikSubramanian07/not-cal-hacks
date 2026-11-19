import { DurableObject } from 'cloudflare:workers'
import type { SqlValue, Statement, StatementResult } from '../server/db/protocol'
import { MIGRATIONS } from './migrations.generated'

/*
 * The application database: one SQLite-backed Durable Object.
 *
 * The whole dataset is a few hundred rows that every request needs a
 * consistent view of, so there is no natural shard and there is one instance.
 * A Durable Object runs one event at a time, and `transactionSync` cannot be
 * interleaved with anything, which makes every `execute` call atomic and makes
 * concurrent callers strictly serial. That is the property the status
 * transitions in `server/db/transition.ts` rely on.
 */

interface MigrationRow extends Record<string, SqlStorageValue> {
  version: number
}

export class AppDatabase extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)
    // Nothing is delivered to the object until the schema is current.
    void ctx.blockConcurrencyWhile(async () => this.migrate())
  }

  /**
   * Brings the schema up to the newest migration compiled into this Worker.
   * Each migration commits together with the row that records it, so a
   * migration is either fully applied and recorded or not applied at all.
   *
   * Foreign keys stay enforced throughout: SQLite ignores
   * `PRAGMA foreign_keys` inside a transaction, so the toggles drizzle-kit
   * writes around a table rebuild do nothing here. A rebuild of a table that
   * other tables cascade from must therefore move the child rows itself.
   */
  private migrate(): void {
    const { sql } = this.ctx.storage
    sql.exec(
      `create table if not exists __migrations (
         version integer primary key,
         name text not null,
         applied_at integer not null
       )`,
    )
    const current =
      sql.exec<MigrationRow>('select coalesce(max(version), 0) as version from __migrations').one()
        .version ?? 0

    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue
      this.ctx.storage.transactionSync(() => {
        for (const statement of migration.statements) {
          sql.exec(statement)
        }
        sql.exec(
          'insert into __migrations (version, name, applied_at) values (?, ?, ?)',
          migration.version,
          migration.name,
          Date.now(),
        )
      })
    }
  }

  /**
   * Runs the statements in order inside one transaction and returns one result
   * per statement. A throw anywhere rolls every statement back.
   */
  execute(statements: Statement[]): StatementResult[] {
    return this.ctx.storage.transactionSync(() => statements.map((s) => this.run(s)))
  }

  private run(statement: Statement): StatementResult {
    const { sql } = this.ctx.storage
    const cursor = sql.exec(statement.sql, ...statement.params)
    const columns = cursor.columnNames
    // Draining the cursor is what finalizes the read and write counters.
    const rows = [...cursor.raw()] as SqlValue[][]
    const { rowsRead, rowsWritten } = cursor

    const counters = sql
      .exec<{ changes: number; id: number }>(
        'select changes() as changes, last_insert_rowid() as id',
      )
      .one()

    return {
      columns,
      rows,
      rowsRead,
      rowsWritten,
      // `changes()` still reports the previous write after a read.
      changes: rowsWritten > 0 ? counters.changes : 0,
      lastRowId: counters.id,
      sizeAfter: sql.databaseSize,
    }
  }
}
