/**
 * Edge middleware for agent-facing HTTP behavior.
 *
 * - Real HTTP 404/410 for unknown paths (ends soft-404 SPA fallback)
 * - Markdown content negotiation on public pages (Accept: text/markdown)
 * - SPA shell only for known application routes
 * - Discovery Link headers and ?mode=agent
 * - MCP endpoints at /mcp and /.well-known/mcp
 */

import {
  appendVaryAccept,
  isAgentUserAgent,
  preferredType,
  wantsMarkdown,
} from '../server/lib/accept'
import {
  NOT_FOUND_MARKDOWN,
  agentModeDocument,
  markdownForPath,
  markdownTwinPath,
} from '../server/lib/agent-content'
import { isSpaRoute, normalizePath } from '../shared/site'
import { handleMcpRequest } from '../server/routes/mcp'
import { openApiResponse } from '../server/routes/public'

const STATIC_EXT =
  /\.(?:css|js|mjs|map|png|jpe?g|webp|gif|svg|avif|ico|woff2?|ttf|otf|eot|xml|txt|json|pdf|webmanifest|md)$/i

function discoveryLinkHeader(url: URL): string {
  const twin = markdownTwinPath(url.pathname)
  const parts = [
    `</sitemap.xml>; rel="sitemap"`,
    twin ? `<${twin}>; rel="alternate"; type="text/markdown"` : null,
    `</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    `</.well-known/api-catalog>; rel="https://www.rfc-editor.org/info/rfc9727"`,
    `</.well-known/ard.json>; rel="ard"`,
    `</.well-known/ai-catalog.json>; rel="ai-catalog"`,
    `</mcp>; rel="mcp"`,
    `</llms.txt>; rel="llms-txt"`,
  ]
  return parts.filter(Boolean).join(', ')
}

function markdownResponse(body: string, status = 200): Response {
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    'Access-Control-Allow-Origin': '*',
  })
  appendVaryAccept(headers)
  return new Response(body, { status, headers })
}

function notFound(request: Request): Response {
  if (wantsMarkdown(request) || isAgentUserAgent(request.headers.get('user-agent'))) {
    return markdownResponse(NOT_FOUND_MARKDOWN, 404)
  }
  // Minimal HTML 404 — real status, not the SPA shell.
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>404 — not-cal-hacks</title>
<meta name="robots" content="noindex"/>
<link rel="canonical" href="https://not-cal-hacks.pages.dev/"/>
</head><body>
<h1>Not found</h1>
<p>This path does not exist on not-cal-hacks. See <a href="/llms.txt">llms.txt</a>,
<a href="/sitemap.xml">sitemap.xml</a>, or <a href="/docs">API docs</a>.</p>
</body></html>`
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
  })
  appendVaryAccept(headers)
  return new Response(html, { status: 404, headers })
}

async function serveSpa(
  context: EventContext<{ ASSETS: Fetcher }, string, unknown>,
  url: URL,
): Promise<Response> {
  const assetUrl = new URL('/index.html', url.origin)
  const assetRequest = new Request(assetUrl.toString(), {
    method: 'GET',
    headers: context.request.headers,
  })
  const asset = await context.env.ASSETS.fetch(assetRequest)
  const headers = new Headers(asset.headers)
  appendVaryAccept(headers)
  headers.set('Link', discoveryLinkHeader(url))
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  return new Response(asset.body, { status: 200, headers })
}

function withDiscoveryHeaders(response: Response, url: URL): Response {
  const headers = new Headers(response.headers)
  if (!headers.has('Link')) headers.set('Link', discoveryLinkHeader(url))
  // Ensure Markdown/JSON discovery files advertise negotiation where relevant.
  if (url.pathname.endsWith('.md') || url.pathname === '/index.md') {
    headers.set('Content-Type', 'text/markdown; charset=utf-8')
    appendVaryAccept(headers)
  }
  if (url.pathname === '/openapi.json' || url.pathname === '/api/openapi.json') {
    headers.set('Content-Type', 'application/vnd.oai.openapi+json;version=3.1')
  }
  if (url.pathname === '/.well-known/api-catalog') {
    headers.set(
      'Content-Type',
      'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"',
    )
  }
  return new Response(response.body, { status: response.status, headers })
}

export const onRequest: PagesFunction<{ ASSETS: Fetcher }> = async (context) => {
  const url = new URL(context.request.url)
  const path = normalizePath(url.pathname)

  if (context.request.method === 'OPTIONS' && (path === '/mcp' || path === '/.well-known/mcp')) {
    return handleMcpRequest(context.request)
  }

  if (path === '/mcp' || path === '/.well-known/mcp') {
    return handleMcpRequest(context.request)
  }

  // OpenAPI always from the typed builder so static and dynamic stay aligned.
  if (path === '/openapi.json' || path === '/api/openapi.json') {
    if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 })
    }
    return openApiResponse()
  }

  // API routes — hand off to functions/api/[[route]].ts
  if (path === '/api' || path.startsWith('/api/')) {
    return context.next()
  }

  // Agent mode on the homepage
  if (path === '/' && url.searchParams.get('mode') === 'agent') {
    return markdownResponse(agentModeDocument())
  }

  // Static assets and machine-readable files in /public
  if (STATIC_EXT.test(url.pathname) || url.pathname.startsWith('/.well-known/')) {
    const res = await context.next()
    if (res.status === 404) {
      if (url.pathname.endsWith('.md')) {
        const logical =
          url.pathname === '/index.md' ? '/' : normalizePath(url.pathname.replace(/\.md$/, ''))
        const md = markdownForPath(logical)
        if (md) return markdownResponse(md)
      }
      return notFound(context.request)
    }
    return withDiscoveryHeaders(res, url)
  }

  const accept = context.request.headers.get('accept')
  const chosen = preferredType(accept, ['text/html', 'text/markdown'])
  const agentUa = isAgentUserAgent(context.request.headers.get('user-agent'))
  const mdBody = markdownForPath(path)

  if ((chosen === 'text/markdown' || (agentUa && mdBody)) && mdBody) {
    const res = markdownResponse(mdBody)
    const headers = new Headers(res.headers)
    headers.set('Link', discoveryLinkHeader(url))
    return new Response(res.body, { status: res.status, headers })
  }

  if (chosen === null && accept) {
    const headers = new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
    appendVaryAccept(headers)
    return new Response('Not Acceptable\n\nAvailable: text/html, text/markdown\n', {
      status: 406,
      headers,
    })
  }

  if (isSpaRoute(path)) {
    return serveSpa(context, url)
  }

  return notFound(context.request)
}
