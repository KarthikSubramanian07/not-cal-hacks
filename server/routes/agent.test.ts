import { describe, expect, it } from 'vitest'
import { call } from '../test/helpers'
import { handleMcpRequest } from './mcp'
import { buildOpenApiDocument } from '../lib/openapi'
import { buildLlmsTxt, markdownForPath, NOT_FOUND_MARKDOWN } from '../lib/agent-content'

describe('public catalog API', () => {
  it('returns product meta without auth', async () => {
    const response = await call('/api/v1/meta')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { name: string; links: { openapi: string } }
    expect(body.name).toBe('not-cal-hacks')
    expect(body.links.openapi).toContain('/openapi.json')
  })

  it('lists application types', async () => {
    const response = await call('/api/v1/application-types')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { types: Array<{ id: string }> }
    expect(body.types.map((t) => t.id).sort()).toEqual(['hacker', 'judge'])
  })

  it('serves OpenAPI with operationIds and descriptions', async () => {
    const response = await call('/api/openapi.json')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('openapi')
    const doc = (await response.json()) as {
      openapi: string
      paths: Record<string, Record<string, { operationId: string; description: string }>>
    }
    expect(doc.openapi).toMatch(/^3\./)
    const op = doc.paths['/api/v1/meta']?.get
    expect(op?.operationId).toBe('getProductMeta')
    expect(op?.description.length).toBeGreaterThan(20)
  })

  it('keeps public catalog available without a database', async () => {
    const { env } = await import('cloudflare:test')
    const app = (await import('../app')).default
    const noDb = { ...env, DB: undefined } as unknown as typeof env
    const response = await app.fetch(new Request('https://test.local/api/v1/tracks'), noDb)
    expect(response.status).toBe(200)
  })
})

describe('OpenAPI document quality', () => {
  it('gives every operation a unique operationId and description', () => {
    const doc = buildOpenApiDocument()
    const ids = new Set<string>()
    for (const methods of Object.values(doc.paths)) {
      for (const op of Object.values(
        methods as Record<string, { operationId: string; description: string }>,
      )) {
        expect(op.operationId).toBeTruthy()
        expect(op.description.length).toBeGreaterThan(20)
        expect(ids.has(op.operationId)).toBe(false)
        ids.add(op.operationId)
      }
    }
    expect(ids.size).toBeGreaterThan(8)
  })
})

describe('agent content', () => {
  it('includes when-to-use guidance in llms.txt', () => {
    const txt = buildLlmsTxt()
    expect(txt).toMatch(/When to use this/i)
    expect(txt.length).toBeGreaterThan(100)
    expect(txt).toContain('/openapi.json')
  })

  it('has markdown bodies for trust and developer pages', () => {
    for (const path of ['/', '/about', '/contact', '/privacy', '/docs', '/developers']) {
      const md = markdownForPath(path)
      expect(md, path).toBeTruthy()
      expect(md!.length).toBeGreaterThan(500)
    }
    expect(NOT_FOUND_MARKDOWN.length).toBeGreaterThan(20)
    expect(NOT_FOUND_MARKDOWN).toContain('llms.txt')
  })
})

describe('MCP Streamable HTTP', () => {
  it('completes the initialize handshake', async () => {
    const response = await handleMcpRequest(
      new Request('https://test.local/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        }),
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Mcp-Session-Id')).toBeTruthy()
    const body = (await response.json()) as {
      result: { protocolVersion: string; serverInfo: { name: string }; instructions: string }
    }
    expect(body.result.protocolVersion).toBe('2025-11-25')
    expect(body.result.serverInfo.name).toBe('not-cal-hacks')
    expect(body.result.instructions.length).toBeGreaterThan(20)
  })

  it('lists tools with descriptions and schemas', async () => {
    const response = await handleMcpRequest(
      new Request('https://test.local/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      }),
    )
    const body = (await response.json()) as {
      result: { tools: Array<{ name: string; description: string; inputSchema: object }> }
    }
    expect(body.result.tools.length).toBeGreaterThanOrEqual(3)
    for (const tool of body.result.tools) {
      expect(tool.name.length).toBeGreaterThanOrEqual(4)
      expect(tool.description.length).toBeGreaterThanOrEqual(20)
      expect(tool.inputSchema).toBeTruthy()
    }
  })

  it('calls get_product_meta', async () => {
    const response = await handleMcpRequest(
      new Request('https://test.local/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'get_product_meta', arguments: {} },
        }),
      }),
    )
    const body = (await response.json()) as {
      result: { structuredContent: { name: string }; isError: boolean }
    }
    expect(body.result.isError).toBe(false)
    expect(body.result.structuredContent.name).toBe('not-cal-hacks')
  })
})
