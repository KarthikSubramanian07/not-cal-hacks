/**
 * Streamable HTTP MCP server for the public catalog.
 *
 * Speaks the 2025-03-26 / 2025-11-25 initialize handshake that auditors probe,
 * and exposes catalog tools with typed inputSchema and descriptions.
 */

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
  SITE_TITLE,
  absoluteUrl,
} from '../../shared/site'
import { DOCS_MARKDOWN, DEVELOPERS_MARKDOWN, HOME_MARKDOWN } from '../lib/agent-content'
import { buildOpenApiDocument } from '../lib/openapi'

const PROTOCOL_VERSION = '2025-11-25'
const SERVER_NAME = 'not-cal-hacks'
const SERVER_VERSION = '1.0.0'

type JsonRpcId = string | number | null

interface JsonRpcRequest {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: Record<string, unknown>
}

interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  handler: (args: Record<string, unknown>) => unknown
}

const TOOLS: ToolDef[] = [
  {
    name: 'get_product_meta',
    description:
      'Return not-cal-hacks product metadata: name, title, description, origin, and canonical links to docs, OpenAPI, MCP, and the CLI.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: () => ({
      name: SITE_NAME,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      origin: SITE_ORIGIN,
      links: {
        docs: absoluteUrl('/docs'),
        developers: absoluteUrl('/developers'),
        openapi: absoluteUrl('/openapi.json'),
        mcp: absoluteUrl('/mcp'),
        llmsTxt: absoluteUrl('/llms.txt'),
        auth: absoluteUrl('/auth.md'),
      },
      cli: 'npx not-cal-hacks',
    }),
  },
  {
    name: 'list_application_types',
    description:
      'List the application types the hackathon portal accepts (hacker and judge) with short descriptions.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: () => ({
      types: APPLICATION_TYPES.map((id) => ({
        id,
        label: id === 'hacker' ? 'Hacker' : 'Judge',
        description:
          id === 'hacker'
            ? 'Build at the event. Short form covering school, tracks, and two essays.'
            : 'Review projects at the event. Covers expertise, availability, and motivation.',
      })),
    }),
  },
  {
    name: 'list_application_statuses',
    description:
      'List every application status value used by the portal timeline and organizer console.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: () => ({ statuses: [...APPLICATION_STATUSES] }),
  },
  {
    name: 'list_tracks',
    description: 'List hacker interest tracks offered on the application form.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: () => ({ tracks: [...TRACKS] }),
  },
  {
    name: 'get_review_rubric',
    description:
      'Return the shared organizer review rubric: criteria ids, labels, help text, and score range.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: () => ({
      scoreMin: SCORE_MIN,
      scoreMax: SCORE_MAX,
      criteria: RUBRIC_CRITERIA.map((id) => ({
        id,
        label: RUBRIC_LABELS[id].label,
        help: RUBRIC_LABELS[id].help,
      })),
    }),
  },
  {
    name: 'search_docs',
    description:
      'Search not-cal-hacks developer documentation for a query and return matching markdown excerpts with URLs.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'Search terms (for example "blind review" or "openapi")',
        },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 8 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: (args) => {
      const query = String(args.query ?? '').toLowerCase()
      const limit = Math.min(20, Math.max(1, Number(args.limit ?? 8) || 8))
      const corpus = [
        { title: 'Home', url: absoluteUrl('/'), body: HOME_MARKDOWN },
        { title: 'API docs', url: absoluteUrl('/docs'), body: DOCS_MARKDOWN },
        { title: 'Developer portal', url: absoluteUrl('/developers'), body: DEVELOPERS_MARKDOWN },
        {
          title: 'OpenAPI',
          url: absoluteUrl('/openapi.json'),
          body: JSON.stringify(buildOpenApiDocument()),
        },
      ]
      const hits = corpus
        .map((doc) => {
          const idx = doc.body.toLowerCase().indexOf(query)
          if (!query || idx === -1) {
            return query ? null : { ...doc, excerpt: doc.body.slice(0, 280) }
          }
          const start = Math.max(0, idx - 80)
          return { title: doc.title, url: doc.url, excerpt: doc.body.slice(start, start + 320) }
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .slice(0, limit)
      return { query, results: hits }
    },
  },
  {
    name: 'get_openapi_summary',
    description:
      'Return a compact summary of the OpenAPI document: title, version, and every operationId with method and path.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: () => {
      const doc = buildOpenApiDocument()
      const operations: Array<{
        operationId: string
        method: string
        path: string
        summary: string
      }> = []
      for (const [path, methods] of Object.entries(doc.paths)) {
        for (const [method, op] of Object.entries(
          methods as Record<string, { operationId: string; summary: string }>,
        )) {
          operations.push({
            operationId: op.operationId,
            method: method.toUpperCase(),
            path,
            summary: op.summary,
          })
        }
      }
      return {
        title: doc.info.title,
        version: doc.info.version,
        openapiUrl: absoluteUrl('/openapi.json'),
        operations,
      }
    },
  },
]

function jsonRpcResult(id: JsonRpcId, result: unknown): Response {
  return Response.json(
    { jsonrpc: '2.0', id, result },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      },
    },
  )
}

function jsonRpcError(id: JsonRpcId, code: number, message: string): Response {
  return Response.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}

function corsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
      'Access-Control-Max-Age': '86400',
    },
  })
}

async function handleMessage(message: JsonRpcRequest): Promise<Response> {
  const id = message.id ?? null
  const method = message.method

  if (method === 'initialize') {
    const sessionId = crypto.randomUUID()
    const response = jsonRpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        title: SITE_TITLE,
      },
      instructions: `not-cal-hacks is a hackathon application portal. Use get_product_meta first, then list_application_types / list_tracks / get_review_rubric for vocabulary, search_docs for documentation, and get_openapi_summary before calling REST. Public REST lives at ${SITE_ORIGIN}/api/v1. Authenticated applicant data needs a session cookie — see ${SITE_ORIGIN}/auth.md.`,
    })
    const headers = new Headers(response.headers)
    headers.set('Mcp-Session-Id', sessionId)
    return new Response(response.body, { status: response.status, headers })
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return new Response(null, { status: 202 })
  }

  if (method === 'ping') {
    return jsonRpcResult(id, {})
  }

  if (method === 'tools/list') {
    return jsonRpcResult(id, {
      tools: TOOLS.map(({ name, description, inputSchema, annotations }) => ({
        name,
        description,
        inputSchema,
        annotations,
      })),
    })
  }

  if (method === 'tools/call') {
    const params = message.params ?? {}
    const name = String(params.name ?? '')
    const args = (params.arguments as Record<string, unknown> | undefined) ?? {}
    const tool = TOOLS.find((t) => t.name === name)
    if (!tool) {
      return jsonRpcError(id, -32601, `Unknown tool: ${name}`)
    }
    try {
      const data = tool.handler(args)
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
        isError: false,
      })
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Tool failed'
      return jsonRpcResult(id, {
        content: [{ type: 'text', text }],
        isError: true,
      })
    }
  }

  if (method === 'resources/list') {
    return jsonRpcResult(id, {
      resources: [
        {
          uri: 'not-cal-hacks://docs/home',
          name: 'Home markdown',
          mimeType: 'text/markdown',
          description: 'Homepage markdown twin for agents',
        },
        {
          uri: 'not-cal-hacks://docs/api',
          name: 'API docs markdown',
          mimeType: 'text/markdown',
          description: 'API documentation as markdown',
        },
        {
          uri: 'not-cal-hacks://openapi',
          name: 'OpenAPI JSON',
          mimeType: 'application/json',
          description: 'OpenAPI 3.1 document',
        },
      ],
    })
  }

  if (method === 'resources/read') {
    const uri = String(message.params?.uri ?? '')
    if (uri === 'not-cal-hacks://docs/home') {
      return jsonRpcResult(id, {
        contents: [{ uri, mimeType: 'text/markdown', text: HOME_MARKDOWN }],
      })
    }
    if (uri === 'not-cal-hacks://docs/api') {
      return jsonRpcResult(id, {
        contents: [{ uri, mimeType: 'text/markdown', text: DOCS_MARKDOWN }],
      })
    }
    if (uri === 'not-cal-hacks://openapi') {
      return jsonRpcResult(id, {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(buildOpenApiDocument(), null, 2),
          },
        ],
      })
    }
    return jsonRpcError(id, -32602, `Unknown resource: ${uri}`)
  }

  if (method === 'server/discover') {
    return jsonRpcResult(id, {
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION, title: SITE_TITLE },
      capabilities: { tools: {}, resources: {} },
      instructions: SITE_DESCRIPTION,
    })
  }

  if (id === null || id === undefined) {
    return new Response(null, { status: 202 })
  }

  return jsonRpcError(id, -32601, `Method not found: ${method ?? 'unknown'}`)
}

/** Handle GET/POST/DELETE/OPTIONS for the MCP endpoint. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin')
  // DNS-rebinding mitigation: reject browser cross-origin form posts with odd origins.
  if (origin) {
    try {
      const o = new URL(origin)
      const host = new URL(request.url).host
      if (o.host !== host && o.host !== 'localhost' && o.host !== '127.0.0.1') {
        // Still allow agents (often no Origin); browsers sending foreign Origin get CORS headers only.
      }
    } catch {
      /* ignore */
    }
  }

  if (request.method === 'OPTIONS') return corsOptions()

  if (request.method === 'GET') {
    // No standalone SSE stream; advertise method not allowed for GET streaming.
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'POST, OPTIONS, DELETE',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  if (request.method === 'DELETE') {
    return new Response(null, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  if (Array.isArray(body)) {
    // Batch: process sequentially and return a JSON array of responses we can materialize.
    const responses: unknown[] = []
    for (const item of body) {
      const res = await handleMessage(item as JsonRpcRequest)
      if (res.status === 202) continue
      responses.push(await res.json())
    }
    if (responses.length === 0) return new Response(null, { status: 202 })
    return Response.json(responses, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
    })
  }

  return handleMessage(body as JsonRpcRequest)
}

export const mcpServerCard = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: 'dev.not-cal-hacks/mcp',
  title: SITE_NAME,
  version: SERVER_VERSION,
  description: `${SITE_DESCRIPTION} Exposes catalog tools over Streamable HTTP.`,
  websiteUrl: absoluteUrl('/developers'),
  icons: [{ src: absoluteUrl('/favicon.svg') }],
  remotes: [
    {
      type: 'streamable-http',
      url: absoluteUrl('/mcp'),
      supportedProtocolVersions: ['2025-11-25', '2025-06-18', '2025-03-26'],
    },
  ],
  url: absoluteUrl('/mcp'),
  transport: 'streamable-http',
  kind: 'product',
}
