/**
 * Registers in-page tools for browser-resident agents (WebMCP).
 * Fails silently when the host has no modelContext API.
 */

import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE } from '@shared/site'

type ToolHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>

interface ModelContext {
  registerTool?: (tool: {
    name: string
    description: string
    inputSchema?: Record<string, unknown>
    execute: ToolHandler
  }) => void
}

function ctx(): ModelContext | null {
  const doc = document as Document & { modelContext?: ModelContext }
  const nav = navigator as Navigator & { modelContext?: ModelContext }
  return doc.modelContext ?? nav.modelContext ?? null
}

export function registerWebMcpTools(): void {
  const model = ctx()
  if (!model?.registerTool) return

  const tools: Array<{
    name: string
    description: string
    execute: ToolHandler
  }> = [
    {
      name: 'get_product_meta',
      description: 'Return not-cal-hacks product metadata and canonical developer links.',
      execute: () => ({
        name: SITE_NAME,
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        origin: SITE_ORIGIN,
        docs: `${SITE_ORIGIN}/docs`,
        developers: `${SITE_ORIGIN}/developers`,
        openapi: `${SITE_ORIGIN}/openapi.json`,
        mcp: `${SITE_ORIGIN}/mcp`,
      }),
    },
    {
      name: 'get_scoreboard_links',
      description: 'Return agent discovery URLs for not-cal-hacks (llms.txt, OpenAPI, MCP, ARD).',
      execute: () => ({
        llmsTxt: `${SITE_ORIGIN}/llms.txt`,
        openapi: `${SITE_ORIGIN}/openapi.json`,
        mcp: `${SITE_ORIGIN}/mcp`,
        ard: `${SITE_ORIGIN}/.well-known/ard.json`,
        auth: `${SITE_ORIGIN}/auth.md`,
      }),
    },
    {
      name: 'open_developer_portal',
      description: 'Navigate the browser to the not-cal-hacks developer portal.',
      execute: () => {
        window.location.assign('/developers')
        return { ok: true, path: '/developers' }
      },
    },
  ]

  for (const tool of tools) {
    try {
      model.registerTool({
        ...tool,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      })
    } catch {
      // Host rejected registration; ignore.
    }
  }
}
