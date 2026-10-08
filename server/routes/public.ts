import { Hono } from 'hono'
import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  RUBRIC_CRITERIA,
  RUBRIC_LABELS,
  SCORE_MAX,
  SCORE_MIN,
  TRACKS,
} from '../../shared/constants'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TAGLINE,
  SITE_TITLE,
  absoluteUrl,
} from '../../shared/site'
import { buildOpenApiDocument } from '../lib/openapi'
import type { AppEnv } from '../types'

const TYPE_COPY: Record<
  (typeof APPLICATION_TYPES)[number],
  { label: string; description: string }
> = {
  hacker: {
    label: 'Hacker',
    description: 'Build at the event. Short form covering school, tracks, and two essays.',
  },
  judge: {
    label: 'Judge',
    description: 'Review projects at the event. Covers expertise, availability, and motivation.',
  },
}

const publicApi = new Hono<AppEnv>()

publicApi.get('/', (c) =>
  c.json({
    name: SITE_NAME,
    version: '1.0.0',
    documentation: absoluteUrl('/docs'),
    openapi: absoluteUrl('/openapi.json'),
    mcp: absoluteUrl('/mcp'),
    cli: 'not-cal-hacks',
    endpoints: [
      '/api/health',
      '/api/v1',
      '/api/v1/meta',
      '/api/v1/application-types',
      '/api/v1/statuses',
      '/api/v1/tracks',
      '/api/v1/rubric',
      '/openapi.json',
      '/api/openapi.json',
    ],
  }),
)

publicApi.get('/meta', (c) =>
  c.json({
    name: SITE_NAME,
    title: SITE_TITLE,
    tagline: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    origin: SITE_ORIGIN,
    applicationTypes: [...APPLICATION_TYPES],
    statuses: [...APPLICATION_STATUSES],
    tracks: [...TRACKS],
    links: {
      home: absoluteUrl('/'),
      docs: absoluteUrl('/docs'),
      developers: absoluteUrl('/developers'),
      openapi: absoluteUrl('/openapi.json'),
      mcp: absoluteUrl('/mcp'),
      llmsTxt: absoluteUrl('/llms.txt'),
      auth: absoluteUrl('/auth.md'),
      about: absoluteUrl('/about'),
      contact: absoluteUrl('/contact'),
      privacy: absoluteUrl('/privacy'),
      pricing: absoluteUrl('/pricing'),
      github: 'https://github.com/KarthikSubramanian07/not-cal-hacks',
    },
  }),
)

publicApi.get('/application-types', (c) =>
  c.json({
    types: APPLICATION_TYPES.map((id) => ({
      id,
      label: TYPE_COPY[id].label,
      description: TYPE_COPY[id].description,
    })),
  }),
)

publicApi.get('/statuses', (c) => c.json({ statuses: [...APPLICATION_STATUSES] }))

publicApi.get('/tracks', (c) => c.json({ tracks: [...TRACKS] }))

publicApi.get('/rubric', (c) =>
  c.json({
    scoreMin: SCORE_MIN,
    scoreMax: SCORE_MAX,
    criteria: RUBRIC_CRITERIA.map((id) => ({
      id,
      label: RUBRIC_LABELS[id].label,
      help: RUBRIC_LABELS[id].help,
    })),
  }),
)

export function openApiResponse(): Response {
  const doc = buildOpenApiDocument()
  return new Response(JSON.stringify(doc, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.oai.openapi+json;version=3.1',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export default publicApi
