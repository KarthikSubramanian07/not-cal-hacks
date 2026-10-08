/**
 * Writes machine-readable agent discovery files into `public/` from the
 * shared content modules so static assets cannot drift from the Worker.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ABOUT_MARKDOWN,
  AGENTS_MARKDOWN,
  AUTH_MARKDOWN,
  CONTACT_MARKDOWN,
  DEVELOPERS_MARKDOWN,
  DOCS_MARKDOWN,
  HOME_MARKDOWN,
  PRICING_MARKDOWN,
  PRIVACY_MARKDOWN,
  buildLlmsFullTxt,
  buildLlmsTxt,
} from '../server/lib/agent-content'
import { buildOpenApiDocument } from '../server/lib/openapi'
import { mcpServerCard } from '../server/routes/mcp'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE, absoluteUrl } from '../shared/site'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

function write(rel: string, body: string | object, json = false) {
  const path = join(pub, rel)
  mkdirSync(dirname(path), { recursive: true })
  const data = json ? JSON.stringify(body, null, 2) + '\n' : String(body)
  writeFileSync(path, data.endsWith('\n') ? data : data + '\n')
  console.log(`wrote ${rel}`)
}

const lastmod = '2026-10-08'

const ardCatalog = {
  specVersion: '1.0',
  host: {
    displayName: SITE_NAME,
    identifier: `did:web:not-cal-hacks.pages.dev`,
    documentationUrl: absoluteUrl('/docs'),
  },
  entries: [
    {
      identifier: 'urn:air:not-cal-hacks.pages.dev:mcp:portal',
      displayName: `${SITE_NAME} MCP server`,
      type: 'application/mcp-server-card+json',
      url: absoluteUrl('/.well-known/mcp/server-card.json'),
      description: SITE_DESCRIPTION,
      tags: ['hackathon', 'application-portal', 'blind-review', 'mcp'],
      capabilities: [
        'get_product_meta',
        'list_application_types',
        'list_application_statuses',
        'list_tracks',
        'get_review_rubric',
        'search_docs',
        'get_openapi_summary',
      ],
      representativeQueries: [
        'hackathon application portal with blind review',
        'not-cal-hacks OpenAPI',
        'list application types for not-cal-hacks',
      ],
      trustManifest: {
        identity: 'did:web:not-cal-hacks.pages.dev',
        identityType: 'did',
      },
    },
    {
      identifier: 'urn:air:not-cal-hacks.pages.dev:api:v1',
      displayName: `${SITE_NAME} public API`,
      type: 'application/vnd.oai.openapi+json',
      url: absoluteUrl('/openapi.json'),
      description: 'Public REST catalog and documented session APIs for the hackathon portal.',
      tags: ['rest', 'openapi', 'hackathon'],
      capabilities: ['getHealth', 'getProductMeta', 'listApplicationTypes', 'getRubric'],
      representativeQueries: ['not-cal-hacks API', 'hackathon application types API'],
      trustManifest: {
        identity: 'did:web:not-cal-hacks.pages.dev',
        identityType: 'did',
      },
    },
  ],
}

const apiCatalog = {
  linkset: [
    {
      anchor: `${SITE_ORIGIN}/`,
      item: [
        {
          href: absoluteUrl('/openapi.json'),
          type: 'application/vnd.oai.openapi+json;version=3.1',
          title: `${SITE_NAME} API`,
        },
      ],
      'service-desc': [
        {
          href: absoluteUrl('/openapi.json'),
          type: 'application/vnd.oai.openapi+json;version=3.1',
          title: `${SITE_NAME} OpenAPI specification`,
        },
      ],
    },
  ],
}

const oauthProtectedResource = {
  resource: SITE_ORIGIN,
  authorization_servers: [SITE_ORIGIN],
  bearer_methods_supported: ['cookie', 'header'],
  scopes_supported: ['applicant', 'organizer'],
  resource_documentation: absoluteUrl('/auth.md'),
  resource_name: SITE_NAME,
}

const agentCard = {
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: absoluteUrl('/'),
  version: '1.0.0',
  protocolVersion: '0.2.9',
  preferredTransport: 'JSONRPC',
  skills: [
    {
      id: 'hackathon-portal-catalog',
      name: 'Hackathon application portal catalog',
      description:
        'Expose application types, tracks, statuses, and the review rubric for not-cal-hacks.',
      tags: ['hackathon', 'applications', 'rubric'],
      examples: ['List application types', 'Show the review rubric'],
    },
  ],
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['application/json', 'text/markdown'],
  provider: { organization: SITE_NAME, url: SITE_ORIGIN },
}

const skillBody = `# ${SITE_NAME}

Integrate with the not-cal-hacks hackathon application portal.

## When to use

- Need a hackathon application portal with blind review and status tracking
- Need OpenAPI, MCP, or CLI access to not-cal-hacks vocabulary and docs

## Steps

1. Read ${absoluteUrl('/llms.txt')}
2. Fetch ${absoluteUrl('/openapi.json')}
3. Call keyless GET ${absoluteUrl('/api/v1/meta')}
4. Optional: connect MCP at ${absoluteUrl('/mcp')}
5. Optional: \`npx not-cal-hacks meta\`
`

const skillDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(skillBody))
const digestHex = [...new Uint8Array(skillDigest)]
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')

write('llms.txt', buildLlmsTxt())
write('llms-full.txt', buildLlmsFullTxt())
write('auth.md', AUTH_MARKDOWN)
write('agents.md', AGENTS_MARKDOWN)
write('index.md', HOME_MARKDOWN)
write('about.md', ABOUT_MARKDOWN)
write('contact.md', CONTACT_MARKDOWN)
write('privacy.md', PRIVACY_MARKDOWN)
write('docs.md', DOCS_MARKDOWN)
write('developers.md', DEVELOPERS_MARKDOWN)
write('pricing.md', PRICING_MARKDOWN)
write('openapi.json', buildOpenApiDocument(), true)

write(
  'docs/llms.txt',
  `# ${SITE_NAME} docs

> API documentation index for agents.

- [API docs](${absoluteUrl('/docs')})
- [OpenAPI](${absoluteUrl('/openapi.json')})
- [Auth](${absoluteUrl('/auth.md')})
`,
)

write(
  'api/llms.txt',
  `# ${SITE_NAME} API

> Public REST catalog.

- [API root](${absoluteUrl('/api/v1')})
- [Meta](${absoluteUrl('/api/v1/meta')})
- [OpenAPI](${absoluteUrl('/openapi.json')})
`,
)

write(
  'developers/llms.txt',
  `# ${SITE_NAME} developers

> Developer portal index.

- [Portal](${absoluteUrl('/developers')})
- [MCP](${absoluteUrl('/mcp')})
- [CLI](https://www.npmjs.com/package/not-cal-hacks)
`,
)

write('.well-known/ard.json', ardCatalog, true)
write('.well-known/ai-catalog.json', ardCatalog, true)
write('.well-known/api-catalog', apiCatalog, true)
write('.well-known/mcp.json', mcpServerCard, true)
write('.well-known/mcp/server-card.json', mcpServerCard, true)
write('.well-known/oauth-protected-resource', oauthProtectedResource, true)
write('.well-known/agent-card.json', agentCard, true)
write(
  '.well-known/agent-skills/index.json',
  {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      {
        name: 'not-cal-hacks',
        type: 'skill-md',
        description:
          'Integrate with the not-cal-hacks hackathon application portal via OpenAPI, MCP, or CLI.',
        url: '/.well-known/agent-skills/not-cal-hacks/SKILL.md',
        digest: `sha256:${digestHex}`,
      },
    ],
  },
  true,
)
write('.well-known/agent-skills/not-cal-hacks/SKILL.md', skillBody)

write(
  'robots.txt',
  `User-agent: *
Allow: /
Allow: /docs
Allow: /developers
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /pricing
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /openapi.json
Allow: /auth.md
Allow: /agents.md
Allow: /api/health
Allow: /api/v1
Allow: /api/v1/
Allow: /mcp
Allow: /.well-known/

Disallow: /admin
Disallow: /status
Disallow: /apply/
Disallow: /login
Disallow: /signup
Disallow: /api/auth
Disallow: /api/applications
Disallow: /api/admin

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: ora-agent
Allow: /

User-agent: DeepSeekBot
Allow: /

# Content Signals: search=yes, ai-train=yes
Sitemap: ${SITE_ORIGIN}/sitemap.xml
`,
)

write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/docs',
  '/developers',
  '/pricing',
  '/llms.txt',
  '/openapi.json',
  '/auth.md',
  '/agents.md',
]
  .map(
    (p) => `  <url>
    <loc>${absoluteUrl(p === '/' ? '/' : p)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
)

write(
  '404.html',
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>404 — ${SITE_NAME}</title>
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#121319" />
    <style>
      body { margin: 0; background: #121319; color: #fafafa; font-family: ui-sans-serif, system-ui, sans-serif; }
      main { max-width: 36rem; margin: 4rem auto; padding: 0 1.25rem; }
      a { color: #e8a33d; }
    </style>
  </head>
  <body>
    <main>
      <p>Error 404</p>
      <h1>Nothing filed here</h1>
      <p>This path does not exist on ${SITE_NAME}. See <a href="/llms.txt">llms.txt</a>,
      <a href="/sitemap.xml">sitemap.xml</a>, or <a href="/docs">API docs</a>.</p>
    </main>
  </body>
</html>
`,
)

console.log(`sync-agent-assets: ${SITE_TITLE}`)
