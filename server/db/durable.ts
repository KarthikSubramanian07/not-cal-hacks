import {
  DATABASE_INSTANCE,
  type DatabaseNamespace,
  type SqlValue,
  type Statement,
  type StatementResult,
} from './protocol'

/*
 * A D1-shaped client for a SQLite-backed Durable Object.
 *
 * The database lives inside one Durable Object hosted by the companion Worker
 * in `worker/`. Everything above this file was written against the D1 client
 * API (`prepare`, `bind`, `first`, `all`, `run`, `raw`, `batch`), and Drizzle's
 * D1 driver speaks the same one, so this adapter reproduces that surface and
 * turns each call into a single RPC. No query had to change.
 *
 * `batch` is the important one. It sends every statement in one call and the
 * object runs them in one synchronous transaction, so a batch is atomic in the
 * same way it was on D1: if any statement fails, none of them happened.
 */

/** Mirrors what D1 accepts as a bound value, including its refusals. */
function toSqlValue(value: unknown): SqlValue {
  if (value === null) return null
  switch (typeof value) {
    case 'string':
      return value
    case 'number':
      return value
    case 'boolean':
      return value ? 1 : 0
    case 'object':
      if (value instanceof ArrayBuffer) return value
      if (ArrayBuffer.isView(value)) {
        const copy = new Uint8Array(value.byteLength)
        copy.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
        return copy.buffer
      }
  }
  throw new TypeError(`Type '${typeof value}' not supported for value '${String(value)}'`)
}

/** D1 hands blobs back as plain byte arrays, so this does too. */
const fromSqlValue = (value: SqlValue): unknown =>
  value instanceof ArrayBuffer ? Array.from(new Uint8Array(value)) : value

function toObjects<T>(result: StatementResult): T[] {
  return result.rows.map((row) => {
    const object: Record<string, unknown> = {}
    // A repeated column name keeps its last value, which is what D1 does.
    result.columns.forEach((column, i) => (object[column] = fromSqlValue(row[i] ?? null)))
    return object as T
  })
}

function toD1Result<T>(result: StatementResult, duration: number): D1Result<T> {
  return {
    success: true,
    results: toObjects<T>(result),
    meta: {
      duration,
      size_after: result.sizeAfter,
      rows_read: result.rowsRead,
      rows_written: result.rowsWritten,
      last_row_id: result.lastRowId,
      changed_db: result.rowsWritten > 0,
      changes: result.changes,
      served_by_primary: true,
    },
  }
}

class DurablePreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly database: DurableDatabase,
    private readonly sql: string,
    private readonly params: SqlValue[] = [],
  ) {}

  bind(...values: unknown[]): DurablePreparedStatement {
    return new DurablePreparedStatement(this.database, this.sql, values.map(toSqlValue))
  }

  /** Whether this statement was prepared by the given database. */
  belongsTo(database: DurableDatabase): boolean {
    return this.database === database
  }

  toStatement(): Statement {
    return { sql: this.sql, params: this.params }
  }

  private async execute(): Promise<{ result: StatementResult; duration: number }> {
    const [timed] = await this.database.send([this.toStatement()])
    return timed!
  }

  first<T = unknown>(colName: string): Promise<T | null>
  first<T = Record<string, unknown>>(): Promise<T | null>
  async first<T>(colName?: string): Promise<T | null> {
    const { result } = await this.execute()
    const row = toObjects<Record<string, unknown>>(result)[0]
    if (!row) return null
    if (colName === undefined) return row as T
    if (!(colName in row)) throw new Error(`Column not found: ${colName}`)
    return row[colName] as T
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const { result, duration } = await this.execute()
    return toD1Result<T>(result, duration)
  }

  all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.run<T>()
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>
  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> {
    const { result } = await this.execute()
    const rows = result.rows.map((row) => row.map(fromSqlValue) as T)
    return options?.columnNames ? [result.columns, ...rows] : rows
  }
}

export class DurableDatabase implements D1Database {
  constructor(private readonly namespace: DatabaseNamespace) {}

  /** One RPC, one transaction. Every public method funnels through here. */
  async send(statements: Statement[]): Promise<{ result: StatementResult; duration: number }[]> {
    if (statements.length === 0) return []
    const started = Date.now()
    const results = await this.namespace.getByName(DATABASE_INSTANCE).execute(statements)
    const duration = Date.now() - started
    return results.map((result) => ({ result, duration }))
  }

  prepare(query: string): DurablePreparedStatement {
    return new DurablePreparedStatement(this, query)
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const prepared = statements.map((statement) => {
      if (!(statement instanceof DurablePreparedStatement) || !statement.belongsTo(this)) {
        throw new TypeError('batch() only accepts statements prepared by this database.')
      }
      return statement.toStatement()
    })
    const results = await this.send(prepared)
    return results.map(({ result, duration }) => toD1Result<T>(result, duration))
  }

  /** Runs a script of statements with no parameters, all or nothing. */
  async exec(query: string): Promise<D1ExecResult> {
    const [timed] = await this.send([{ sql: query, params: [] }])
    const count = query.split('\n').filter((line) => line.trim().length > 0).length
    return { count, duration: timed?.duration ?? 0 }
  }

  /**
   * Sessions exist on D1 to pick a read replica. There is exactly one copy of
   * this database and every read is already strongly consistent, so a session
   * is just the database.
   */
  withSession(): D1DatabaseSession {
    return {
      prepare: (query) => this.prepare(query),
      batch: (statements) => this.batch(statements),
      getBookmark: () => null,
    }
  }

  dump(): Promise<ArrayBuffer> {
    return Promise.reject(new Error('dump() is not supported by the Durable Object database.'))
  }
}

/**
 * Swaps the raw Durable Object binding for the D1-shaped client the app
 * expects at `env.DB`. Deployments without the binding (pull request previews)
 * get no `DB` at all, which the app already answers with a 503.
 */
export function withDatabase<E extends { DATABASE?: unknown }>(
  env: E,
): Omit<E, 'DB'> & { DB: D1Database } {
  const namespace = env.DATABASE as DatabaseNamespace | undefined
  return {
    ...env,
    DB: (namespace ? new DurableDatabase(namespace) : undefined) as D1Database,
  }
}
