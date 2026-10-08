#!/usr/bin/env node
/**
 * Official CLI for the not-cal-hacks hackathon application portal.
 *
 * Usage:
 *   npx not-cal-hacks health
 *   npx not-cal-hacks meta
 *   npx not-cal-hacks types
 *   npx not-cal-hacks statuses
 *   npx not-cal-hacks tracks
 *   npx not-cal-hacks rubric
 *   npx not-cal-hacks openapi
 *   npx not-cal-hacks --base https://example.com meta
 */

const DEFAULT_BASE = 'https://not-cal-hacks.pages.dev'

function usage(code = 0) {
  const text = `not-cal-hacks — CLI for the hackathon application portal

Usage:
  not-cal-hacks [--base <url>] <command>

Commands:
  health      GET /api/health
  meta        GET /api/v1/meta
  types       GET /api/v1/application-types
  statuses    GET /api/v1/statuses
  tracks      GET /api/v1/tracks
  rubric      GET /api/v1/rubric
  openapi     GET /openapi.json
  root        GET /api/v1

Options:
  --base <url>   API origin (default: ${DEFAULT_BASE})
  -h, --help     Show this help
`
  console.log(text)
  process.exit(code)
}

function parseArgs(argv) {
  let base = process.env.NOT_CAL_HACKS_BASE || DEFAULT_BASE
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') usage(0)
    if (arg === '--base') {
      base = argv[++i]
      if (!base) {
        console.error('--base requires a URL')
        process.exit(1)
      }
      continue
    }
    rest.push(arg)
  }
  return { base: base.replace(/\/$/, ''), command: rest[0] || 'help', args: rest.slice(1) }
}

const ROUTES = {
  health: '/api/health',
  meta: '/api/v1/meta',
  types: '/api/v1/application-types',
  statuses: '/api/v1/statuses',
  tracks: '/api/v1/tracks',
  rubric: '/api/v1/rubric',
  openapi: '/openapi.json',
  root: '/api/v1',
}

async function main() {
  const { base, command } = parseArgs(process.argv.slice(2))
  if (command === 'help' || !ROUTES[command]) usage(command === 'help' ? 0 : 1)

  const url = `${base}${ROUTES[command]}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'not-cal-hacks-cli/1.0.0' },
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`HTTP ${res.status} from ${url}`)
    console.error(text)
    process.exit(1)
  }
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
