import { DATABASE_INSTANCE, type Statement } from '../server/db/protocol'
import { AppDatabase } from './database'

export { AppDatabase }

interface WorkerEnv {
  DATABASE: DurableObjectNamespace<AppDatabase>
  /**
   * Optional. Enables the operator console below. Unset in production unless
   * someone is actively using it: `wrangler secret put ADMIN_TOKEN`.
   */
  ADMIN_TOKEN?: string
}

/*
 * This Worker exists to host the database object; the Pages project binds to
 * the class directly and never goes through `fetch`.
 *
 * The one route here is the operator console, which replaces
 * `wrangler d1 execute`: seeding a local database, promoting an organizer,
 * answering a support question. It runs SQL, so it is closed by default. With
 * no `ADMIN_TOKEN` secret the Worker answers 404 to everything.
 */

const MIN_TOKEN_LENGTH = 24

const notFound = () => new Response('Not found\n', { status: 404 })

/** Compares in constant time, and without leaking either length. */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

function parseStatements(body: unknown): Statement[] | null {
  if (typeof body !== 'object' || body === null) return null
  const { statements } = body as { statements?: unknown }
  if (!Array.isArray(statements) || statements.length === 0) return null

  const parsed: Statement[] = []
  for (const entry of statements as unknown[]) {
    if (typeof entry !== 'object' || entry === null) return null
    const { sql, params = [] } = entry as { sql?: unknown; params?: unknown }
    if (typeof sql !== 'string' || !Array.isArray(params)) return null
    const scalars = (params as unknown[]).every(
      (p) => p === null || typeof p === 'string' || typeof p === 'number',
    )
    if (!scalars) return null
    parsed.push({ sql, params: params as (string | number | null)[] })
  }
  return parsed
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const expected = env.ADMIN_TOKEN
    if (!expected || expected.length < MIN_TOKEN_LENGTH) return notFound()

    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/exec') return notFound()

    const given = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!(await sameSecret(given, expected))) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const statements = parseStatements(await request.json().catch(() => null))
    if (!statements) {
      return Response.json(
        { error: 'Expected { "statements": [{ "sql": string, "params"?: scalar[] }] }' },
        { status: 400 },
      )
    }

    try {
      // One call, one transaction: a failing statement undoes the whole request.
      const results = await env.DATABASE.getByName(DATABASE_INSTANCE).execute(statements)
      return Response.json({ results })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return Response.json({ error: message }, { status: 400 })
    }
  },
} satisfies ExportedHandler<WorkerEnv>
