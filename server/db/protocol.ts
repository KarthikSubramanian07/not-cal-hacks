/**
 * The wire format between the Pages Functions and the database object.
 *
 * Kept free of runtime imports so both sides can share it: the Functions bundle
 * must not pull in `cloudflare:workers`, and the Worker must not pull in Hono.
 */

/** A value SQLite can store, as it crosses the RPC boundary. */
export type SqlValue = string | number | null | ArrayBuffer

export interface Statement {
  sql: string
  params: SqlValue[]
}

export interface StatementResult {
  /** Column names in select order. Duplicates are preserved, as in a join. */
  columns: string[]
  /** One array per row, positionally matching `columns`. */
  rows: SqlValue[][]
  rowsRead: number
  rowsWritten: number
  /** Rows changed by this statement; zero for a read. */
  changes: number
  lastRowId: number
  /** Database size in bytes after the statement ran. */
  sizeAfter: number
}

/** The one method the database object exposes to its callers. */
export interface DatabaseStub {
  /**
   * Runs every statement in order inside a single transaction. Either all of
   * them take effect or, if any one throws, none do.
   */
  execute(statements: Statement[]): Promise<StatementResult[]>
}

/** The slice of a Durable Object namespace the adapter needs. */
export interface DatabaseNamespace {
  getByName(name: string): DatabaseStub
}

/** There is one database, so there is one object, and this is its name. */
export const DATABASE_INSTANCE = 'primary'
