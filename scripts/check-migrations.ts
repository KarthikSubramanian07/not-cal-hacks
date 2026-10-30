/**
 * Fails when `server/db/schema.ts` and the committed Drizzle snapshots disagree.
 *
 * drizzle-kit diffs the schema against the newest `drizzle/meta/*_snapshot.json`,
 * not against the SQL files. A hand-written migration that ships without its
 * snapshot leaves the two out of step, and the next `npm run db:generate`
 * quietly proposes a migration nobody asked for. This runs the real generator
 * against a scratch copy of `drizzle/` and fails if it writes anything.
 *
 * `drizzle-kit check` is not enough on its own: it validates the migration
 * history but never compares it with the schema. Both run here.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// drizzle-kit prefixes `--out` with `./`, so the scratch copy must live at a
// path relative to the repository root rather than in the system temp dir.
const scratch = path.join('node_modules', '.cache', 'drizzle-drift-check')
const bin = path.join(root, 'node_modules', '.bin', 'drizzle-kit')

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort()
}

function run(args: string[]): string {
  const result = spawnSync(bin, args, { cwd: root, encoding: 'utf8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) {
    console.error(output)
    throw new Error(`drizzle-kit ${args[0]} exited with ${result.status}`)
  }
  return output
}

const scratchAbs = path.join(root, scratch)
rmSync(scratchAbs, { recursive: true, force: true })
mkdirSync(scratchAbs, { recursive: true })
cpSync(path.join(root, 'drizzle'), scratchAbs, { recursive: true })

try {
  run(['check', '--dialect=sqlite', '--out=./drizzle'])

  const before = listFiles(scratchAbs)
  run(['generate', '--dialect=sqlite', '--schema=./server/db/schema.ts', `--out=${scratch}`])
  const added = listFiles(scratchAbs).filter((file) => !before.includes(file))

  if (added.length > 0) {
    console.error(
      'Schema drift: server/db/schema.ts no longer matches the newest snapshot in drizzle/meta.\n' +
        'drizzle-kit generate would create:\n',
    )
    for (const file of added) {
      console.error(`  drizzle/${file}`)
      if (file.endsWith('.sql')) {
        console.error(
          readFileSync(path.join(scratchAbs, file), 'utf8').replace(/^/gm, '    | ') + '\n',
        )
      }
    }
    console.error(
      'Run `npm run db:generate` and commit the result. If the SQL was written by hand, ' +
        'commit the matching snapshot too so the next generate starts from the right state.',
    )
    process.exitCode = 1
  } else {
    process.stdout.write('No drift: the schema matches the committed migrations and snapshots.\n')
  }
} finally {
  if (existsSync(scratchAbs)) rmSync(scratchAbs, { recursive: true, force: true })
}
