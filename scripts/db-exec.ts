/**
 * Runs SQL against the database object. The replacement for `wrangler d1 execute`.
 *
 *   tsx scripts/db-exec.ts --local  --file seed.generated.sql
 *   tsx scripts/db-exec.ts --local  --command "select count(*) from users"
 *   tsx scripts/db-exec.ts --remote --command "update users set role = 'organizer' where email = '...'"
 *
 * Whatever is sent runs as one transaction: a script either applies in full or
 * not at all.
 *
 * `--local` boots the companion Worker against the same `.wrangler/state` that
 * `npm run dev` uses, with a throwaway token, runs the SQL and shuts it down.
 * Stop `npm run dev` first; two processes should not share one SQLite file.
 *
 * `--remote` talks to the deployed Worker's operator console, which is closed
 * unless the Worker has an `ADMIN_TOKEN` secret. It needs:
 *
 *   DB_ADMIN_URL    the Worker's URL, e.g. https://not-cal-hacks-db.<you>.workers.dev
 *   DB_ADMIN_TOKEN  the same value as the Worker's ADMIN_TOKEN secret
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCAL_PORT = 8789

interface StatementResult {
  columns: string[]
  rows: unknown[][]
  rowsRead: number
  rowsWritten: number
  changes: number
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function post(url: string, token: string, sql: string): Promise<StatementResult[]> {
  const response = await fetch(new URL('/exec', url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: [{ sql }] }),
  })
  const text = await response.text()
  if (response.status === 404) {
    fail('The operator console is closed (404). Set the ADMIN_TOKEN secret on the Worker first.')
  }
  let body: { results?: StatementResult[]; error?: string }
  try {
    body = JSON.parse(text) as typeof body
  } catch {
    fail(`Unexpected response (${response.status}): ${text.slice(0, 200)}`)
  }
  if (!response.ok || !body.results) fail(`Failed (${response.status}): ${body.error ?? text}`)
  return body.results
}

/** Boots the companion Worker on a local port and resolves once it answers. */
async function startLocalWorker(token: string): Promise<ChildProcess> {
  const child = spawn(
    path.join(root, 'node_modules', '.bin', 'wrangler'),
    [
      'dev',
      '-c',
      'worker/wrangler.toml',
      '--port',
      String(LOCAL_PORT),
      '--persist-to',
      '.wrangler/state',
      '--var',
      `ADMIN_TOKEN:${token}`,
      '--log-level',
      'error',
    ],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
  )

  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail('The local Worker exited before it was ready.')
    try {
      await fetch(`http://127.0.0.1:${LOCAL_PORT}/`)
      return child
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  child.kill()
  fail('Timed out waiting for the local Worker.')
}

function print(results: StatementResult[]) {
  for (const result of results) {
    if (result.columns.length > 0) {
      console.table(
        result.rows.map((row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]]))),
      )
    }
    console.log(
      `ok: ${result.rows.length} row(s) returned, ${result.rowsRead} read, ${result.rowsWritten} written`,
    )
  }
}

async function main() {
  const file = option('file')
  const command = option('command')
  if ((file === undefined) === (command === undefined)) {
    fail('Pass exactly one of --file <path> or --command "<sql>".')
  }
  const sql = file !== undefined ? readFileSync(path.resolve(file), 'utf8') : command!

  const local = process.argv.includes('--local')
  const remote = process.argv.includes('--remote')
  if (local === remote) fail('Pass exactly one of --local or --remote.')

  if (remote) {
    const url = process.env.DB_ADMIN_URL
    const token = process.env.DB_ADMIN_TOKEN
    if (!url || !token) fail('--remote needs DB_ADMIN_URL and DB_ADMIN_TOKEN in the environment.')
    print(await post(url, token, sql))
    return
  }

  const token = randomBytes(32).toString('hex')
  const worker = await startLocalWorker(token)
  try {
    print(await post(`http://127.0.0.1:${LOCAL_PORT}`, token, sql))
  } finally {
    worker.kill()
  }
}

await main()
