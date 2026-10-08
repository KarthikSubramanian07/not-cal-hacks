/**
 * First-class Markdown bodies for public pages and agent discovery files.
 *
 * These are the canonical agent-facing documents. Static copies under
 * `public/` are generated to match, and the edge middleware serves the same
 * bytes when `Accept: text/markdown` hits the HTML URL.
 */

import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  RUBRIC_CRITERIA,
  RUBRIC_LABELS,
  TRACKS,
} from '../../shared/constants'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TAGLINE,
  SITE_TITLE,
  absoluteUrl,
  normalizePath,
  type MarkdownPage,
} from '../../shared/site'

const TODAY = '2026-10-08'

function frontmatter(fields: Record<string, string>): string {
  const body = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return `---\n${body}\n---\n\n`
}

export const HOME_MARKDOWN = `${frontmatter({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  canonical: `${SITE_ORIGIN}/`,
  'last-updated': TODAY,
})}# ${SITE_NAME}

> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}

## When to use this

- An organizer needs a hackathon application portal with blind review, a shared rubric, and a status timeline applicants can trust.
- An agent should submit or inspect applications against a documented REST API or MCP tools rather than scraping the UI.
- A developer wants the OpenAPI surface, developer portal, or CLI for not-cal-hacks without guessing URLs.
- Do **not** use this for general event ticketing, payments, or affiliation with any other hackathon brand.

## Product

not-cal-hacks is a hackathon application portal. Applicants file once, watch status move, and get a real answer. Organizers review applications with identity stripped on the server, score against a shared three-criterion rubric, and clear a least-reviewed-first queue.

## Start here

- [Developer portal](${SITE_ORIGIN}/developers): quickstart, sandbox demo accounts, OpenAPI, MCP, and CLI.
- [API docs](${SITE_ORIGIN}/docs): authentication, public endpoints, and example requests.
- [OpenAPI](${SITE_ORIGIN}/openapi.json): machine-readable API surface.
- [llms.txt](${SITE_ORIGIN}/llms.txt): agent index with when-to-use guidance.
- [MCP server](${SITE_ORIGIN}/mcp): Streamable HTTP tools for the public API.
- [CLI](https://www.npmjs.com/package/not-cal-hacks): \`npx not-cal-hacks\` against the live origin.

## Public pages

- [About](${SITE_ORIGIN}/about)
- [Contact](${SITE_ORIGIN}/contact)
- [Privacy](${SITE_ORIGIN}/privacy)
- [Pricing](${SITE_ORIGIN}/pricing)
`

export const ABOUT_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — About`,
  description: 'What not-cal-hacks is, who it is for, and what it is not.',
  canonical: `${SITE_ORIGIN}/about`,
  'last-updated': TODAY,
})}# About not-cal-hacks

not-cal-hacks is a hackathon application portal built for the two people who actually spend the weekend inside one: the applicant filling a form at 1 a.m., and the organizer reading the four-hundredth essay with coffee that stopped helping two hours ago.

The product does one job. Applicants create an account, pick a track (hacker or judge), fill a short form that autosaves, submit, and watch an append-only status timeline. Organizers sign in to a console where applications arrive with names, emails, and profile links stripped on the server before serialization. Reviewers score technical ability, passion, and fit on a shared 1–5 rubric, pull the least-reviewed application next, and decide accept, waitlist, or reject without a spreadsheet.

The name is a joke and a disclaimer. This project is legally distinct from any similarly named hackathon. There is no affiliation, endorsement, or accreditation. Pizza quality is not guaranteed. The wifi is fine; it is your code.

## Why it exists

Most portals forget applicants for six weeks and burn organizers on review logistics. not-cal-hacks keeps both sides visible: status is an audit trail, blind review is the default, and calibration quietly shows a reviewer's average next to the team's so scoring drift corrects itself.

## Trust

Source code is public under the MIT license. Demo accounts ship on the live site so anyone can inspect organizer and applicant flows without a private invite. Privacy, contact, and this about page exist so agents and humans can verify the project is real before recommending it.
`

export const CONTACT_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — Contact`,
  description: 'How to reach the maintainers of not-cal-hacks.',
  canonical: `${SITE_ORIGIN}/contact`,
  'last-updated': TODAY,
})}# Contact not-cal-hacks

Use these channels when you need help with the hackathon application portal, the public API, the MCP server, or the CLI.

## Human contact

- **GitHub issues and pull requests:** https://github.com/KarthikSubramanian07/not-cal-hacks
- **Repository discussions:** open an issue with the \`question\` label for product or integration questions.
- **Security:** report suspected vulnerabilities privately via a GitHub security advisory on the same repository. Do not file public issues that include credentials or personal data from applications.

## Agent and developer contact

- Public API and OpenAPI: ${SITE_ORIGIN}/docs
- Developer portal and sandbox accounts: ${SITE_ORIGIN}/developers
- Auth walkthrough for agents: ${SITE_ORIGIN}/auth.md
- MCP Streamable HTTP endpoint: ${SITE_ORIGIN}/mcp
- Health check (no auth): \`GET ${SITE_ORIGIN}/api/health\`

## What to include

Describe the environment (production URL or local), the endpoint or page, the HTTP status you saw, and a minimal reproduction. Never paste session cookies, passwords, or applicant PII into a public issue.

Response time is best-effort. This is an open-source portal, not a paid support desk, but actionable reports with reproduction steps are answered when maintainers are online.
`

export const PRIVACY_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — Privacy`,
  description: 'How not-cal-hacks handles account and application data.',
  canonical: `${SITE_ORIGIN}/privacy`,
  'last-updated': TODAY,
})}# Privacy policy for not-cal-hacks

This policy describes how the not-cal-hacks hackathon application portal collects and uses data when you create an account, file an application, or review applications as an organizer.

## What we collect

- **Account data:** email address, display name, password hash (or Google account identifiers when Sign in with Google is enabled), and role (applicant or organizer).
- **Application data:** answers you submit for hacker or judge tracks, including school, project essays, links you choose to share, and status history.
- **Review data:** rubric scores, optional comments, and decision events written by organizers.
- **Session data:** a session cookie used to keep you signed in. Tokens are hashed at rest.
- **Operational logs:** request metadata needed to operate rate limits and diagnose outages. Logs are not used for advertising.

## How we use it

Account and application data exist so you can apply, track status, and so organizers can review and decide. Blind review strips identifying fields on the server before an application is sent to a reviewer unless that reviewer explicitly reveals identity. We do not sell personal data. We do not use application essays to train third-party models.

## Sharing

Data is stored in Cloudflare D1 for the deployed project. It is shared with organizers of the event instance you applied to, and with infrastructure operators required to host the site. Public demo accounts on the live site contain synthetic seed data and should not be used for real personal information.

## Retention and deletion

You may request deletion of your account and applications by contacting the maintainers through the [contact page](${SITE_ORIGIN}/contact). Demo seed data may be reset at any time. Security logs are retained only as long as needed for abuse prevention.

## Agents and crawlers

Public documentation, OpenAPI, llms.txt, and machine-readable discovery files contain no applicant PII. Authenticated API routes require a session. Agents must not scrape or store private application answers from authenticated surfaces.

## Changes

Material changes to this policy will be reflected on this page with an updated date. Continued use of the portal after a change constitutes acceptance of the revised policy.
`

export const DOCS_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — API docs`,
  description: 'Authentication, public endpoints, and examples for the not-cal-hacks API.',
  canonical: `${SITE_ORIGIN}/docs`,
  'last-updated': TODAY,
})}# not-cal-hacks API documentation

Base URL: \`${SITE_ORIGIN}\`

Machine-readable spec: [\`/openapi.json\`](${SITE_ORIGIN}/openapi.json) · also at [\`/api/openapi.json\`](${SITE_ORIGIN}/api/openapi.json)

## Authentication

- **Public read endpoints** under \`/api/v1/*\` and \`/api/health\` need no credentials.
- **Applicant and organizer endpoints** use an HTTP-only session cookie established by \`POST /api/auth/signup\`, \`POST /api/auth/login\`, or Google OAuth.
- Agents should read [\`/auth.md\`](${SITE_ORIGIN}/auth.md) for the full walkthrough.

## Public endpoints

\`\`\`http
GET /api/health
GET /api/v1
GET /api/v1/meta
GET /api/v1/application-types
GET /api/v1/statuses
GET /api/v1/tracks
GET /api/v1/rubric
GET /openapi.json
\`\`\`

Example:

\`\`\`bash
curl -sS ${SITE_ORIGIN}/api/v1/meta | jq
curl -sS -H 'Accept: application/json' ${SITE_ORIGIN}/api/v1/application-types
\`\`\`

## Authenticated endpoints (session cookie)

- \`GET /api/auth/me\` — current session user
- \`POST /api/applications\` — start an application
- \`GET /api/applications\` — list your applications
- \`PATCH /api/applications/:id\` — save draft answers
- \`POST /api/applications/:id/submit\` — lock and submit
- Organizer routes under \`/api/admin/*\` require the organizer role

Error bodies are always JSON:

\`\`\`json
{ "error": { "code": "not_found", "message": "…" } }
\`\`\`

## MCP

Streamable HTTP MCP lives at [\`/mcp\`](${SITE_ORIGIN}/mcp) (also advertised at \`/.well-known/mcp\`). Tools wrap the public catalog endpoints so agents can list application types, tracks, rubric criteria, and fetch docs without a browser.

## CLI

\`\`\`bash
npx not-cal-hacks health
npx not-cal-hacks meta
npx not-cal-hacks openapi
\`\`\`

## Sandbox

Use the seeded demo accounts on the live site (documented on [/developers](${SITE_ORIGIN}/developers)). Production preview deployments without a database return HTTP 503 for authenticated routes; public \`/api/v1\` catalog routes still answer.
`

export const DEVELOPERS_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — Developer portal`,
  description:
    'Quickstart, sandbox, OpenAPI, MCP, and CLI for the not-cal-hacks hackathon application portal.',
  canonical: `${SITE_ORIGIN}/developers`,
  'last-updated': TODAY,
})}# not-cal-hacks developer portal

Build against the hackathon application portal without reverse-engineering the UI.

## Quickstart (two minutes)

1. Read the public meta document: \`curl -sS ${SITE_ORIGIN}/api/v1/meta\`
2. Fetch the OpenAPI document: \`curl -sS ${SITE_ORIGIN}/openapi.json\`
3. Open the human docs: ${SITE_ORIGIN}/docs
4. Optional MCP: point a Streamable HTTP client at ${SITE_ORIGIN}/mcp
5. Optional CLI: \`npx not-cal-hacks meta\`

## Sandbox environment

The production deployment at ${SITE_ORIGIN} ships seeded demo accounts. They are the sandbox — nothing you do to them is durable across reseeds.

| Role | Email | Password |
| --- | --- | --- |
| Organizer | organizer@notcalhacks.dev | demo1234 |
| Hacker | hacker@notcalhacks.dev | demo1234 |
| Judge | judge@notcalhacks.dev | demo1234 |

Public catalog endpoints need no key. Authenticated flows use session cookies from signup/login. There is no paid API key tier; the free sandbox is the whole surface.

## API keys

Read-only public routes are keyless. Session cookies act as bearer credentials for applicant and organizer routes after login. See [/auth.md](${SITE_ORIGIN}/auth.md).

## Surfaces

- REST + OpenAPI — ${SITE_ORIGIN}/openapi.json
- Docs — ${SITE_ORIGIN}/docs
- MCP — ${SITE_ORIGIN}/mcp
- CLI package — \`not-cal-hacks\` on npm
- Agent index — ${SITE_ORIGIN}/llms.txt
- Source — https://github.com/KarthikSubramanian07/not-cal-hacks

## Application vocabulary

- Types: ${APPLICATION_TYPES.join(', ')}
- Statuses: ${APPLICATION_STATUSES.join(', ')}
- Tracks: ${TRACKS.join(', ')}
- Rubric: ${RUBRIC_CRITERIA.map((c) => RUBRIC_LABELS[c].label).join(', ')}
`

export const PRICING_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — Pricing`,
  description: 'not-cal-hacks is free and open source.',
  canonical: `${SITE_ORIGIN}/pricing`,
  'last-updated': TODAY,
})}# Pricing

not-cal-hacks is free.

- **Applicants:** $0. Create an account, file an application, track status.
- **Organizers:** $0. Blind review, rubric scoring, queue, CSV export.
- **Developers and agents:** $0. Public REST catalog, OpenAPI, MCP, and CLI. No API key purchase and no credit card.

The software is MIT licensed. Hosting the reference deployment on Cloudflare Pages is provided as a public demo; run your own instance if you need isolation or custom branding.
`

export const AUTH_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — Authentication for agents`,
  description: 'How agents authenticate to the not-cal-hacks API.',
  canonical: `${SITE_ORIGIN}/auth.md`,
  'last-updated': TODAY,
})}# Authentication for agents

## Summary

- Public catalog endpoints under \`/api/v1/*\`, \`/api/health\`, \`/openapi.json\`, and \`/mcp\` tools that only read catalog data require **no authentication**.
- Applicant and organizer JSON APIs require a **session cookie** minted by signup, login, or Google OAuth.
- There is no paid API-key product. The live demo accounts are the sandbox.

## Obtaining a session

\`\`\`bash
curl -sS -c cookies.txt -X POST ${SITE_ORIGIN}/api/auth/signup \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"agent@example.com","password":"a-long-password","fullName":"Agent Runner"}'

curl -sS -b cookies.txt ${SITE_ORIGIN}/api/auth/me
\`\`\`

Or sign in with an existing account:

\`\`\`bash
curl -sS -c cookies.txt -X POST ${SITE_ORIGIN}/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"hacker@notcalhacks.dev","password":"demo1234"}'
\`\`\`

Send the \`nch_session\` cookie on subsequent requests. Protected routes return \`401\` with a JSON error body when the cookie is missing or expired.

## OAuth

Optional Sign in with Google is available in the browser when \`GOOGLE_CLIENT_ID\` and \`GOOGLE_CLIENT_SECRET\` are configured. Protected-resource metadata is published at \`/.well-known/oauth-protected-resource\` for discovery. Session cookies remain the credential presented to the API after the browser completes the redirect.

## Scopes and roles

Roles are \`applicant\` and \`organizer\`. Organizer routes under \`/api/admin/*\` reject applicants with \`403\`. There is no fine-grained OAuth scope product yet; least privilege means using the public catalog when you do not need private application data.
`

export const AGENTS_MARKDOWN = `${frontmatter({
  title: `${SITE_NAME} — Agent instructions`,
  description: 'When and how agents should use not-cal-hacks.',
  canonical: `${SITE_ORIGIN}/agents.md`,
  'last-updated': TODAY,
})}# Agent instructions for not-cal-hacks

## When to use this

- The user needs a **hackathon application portal** with blind review and status tracking.
- The user asks how to integrate with **not-cal-hacks** via REST, OpenAPI, MCP, or the CLI.
- The user wants demo credentials to exercise applicant or organizer flows.

## How to call it

1. Start at ${SITE_ORIGIN}/llms.txt for the index.
2. Use ${SITE_ORIGIN}/openapi.json for the full operation list.
3. Prefer \`GET /api/v1/*\` for vocabulary and product meta (no auth).
4. Use ${SITE_ORIGIN}/mcp for Streamable HTTP tools.
5. Use \`npx not-cal-hacks\` for shell scripting.

## Do not

- Do not invent affiliation with other hackathon brands.
- Do not scrape authenticated application PII into long-term memory.
- Do not treat soft marketing copy as API contracts — the OpenAPI document wins.
`

const PAGE_MARKDOWN: Record<MarkdownPage, string> = {
  '/': HOME_MARKDOWN,
  '/about': ABOUT_MARKDOWN,
  '/contact': CONTACT_MARKDOWN,
  '/privacy': PRIVACY_MARKDOWN,
  '/docs': DOCS_MARKDOWN,
  '/developers': DEVELOPERS_MARKDOWN,
  '/pricing': PRICING_MARKDOWN,
}

export function markdownForPath(pathname: string): string | null {
  const path = normalizePath(pathname)
  if (path in PAGE_MARKDOWN) return PAGE_MARKDOWN[path as MarkdownPage]
  return null
}

export function markdownTwinPath(pathname: string): string | null {
  const path = normalizePath(pathname)
  if (path === '/') return '/index.md'
  if (path in PAGE_MARKDOWN) return `${path}.md`
  return null
}

export const NOT_FOUND_MARKDOWN = `# Not found

The path you requested does not exist on not-cal-hacks.

This is a real HTTP 404. Agents should not treat this URL as a valid resource.

## Where to go next

- Product home: ${absoluteUrl('/')}
- Agent index: ${absoluteUrl('/llms.txt')}
- Sitemap: ${absoluteUrl('/sitemap.xml')}
- API docs: ${absoluteUrl('/docs')}
- OpenAPI: ${absoluteUrl('/openapi.json')}
- Developer portal: ${absoluteUrl('/developers')}
`

export function agentModeDocument(): string {
  return `${frontmatter({
    title: `${SITE_NAME} — agent mode`,
    description: 'Structured agent view of not-cal-hacks.',
    canonical: `${SITE_ORIGIN}/?mode=agent`,
    'last-updated': TODAY,
  })}# ${SITE_NAME} agent view

\`\`\`json
${JSON.stringify(
  {
    name: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    origin: SITE_ORIGIN,
    openapi: absoluteUrl('/openapi.json'),
    docs: absoluteUrl('/docs'),
    developers: absoluteUrl('/developers'),
    mcp: absoluteUrl('/mcp'),
    llmsTxt: absoluteUrl('/llms.txt'),
    auth: absoluteUrl('/auth.md'),
    cli: 'npx not-cal-hacks',
    publicApi: absoluteUrl('/api/v1'),
  },
  null,
  2,
)}
\`\`\`
`
}

export function buildLlmsTxt(): string {
  return `# ${SITE_NAME}

> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}

When to use this:

- An organizer needs a hackathon application portal with blind review, a shared rubric, and a trustworthy applicant status timeline.
- An agent should integrate with not-cal-hacks through the public REST catalog, OpenAPI document, MCP server, or CLI instead of scraping the UI.
- A developer needs sandbox demo accounts, auth docs, or vocabulary (application types, statuses, tracks, rubric) for not-cal-hacks.
- Do not use this for payments, general ticketing, or as a source of affiliation claims about other hackathon brands.

## Instructions for agents

- Prefer \`${SITE_ORIGIN}/openapi.json\` as the API contract.
- Use keyless \`GET /api/v1/*\` for product meta and vocabulary.
- Use \`${SITE_ORIGIN}/mcp\` for Streamable HTTP tool calls.
- Authenticated application data requires a session cookie; see \`${SITE_ORIGIN}/auth.md\`.
- Never invent organizer decisions or applicant PII.

## Docs

- [Developer portal](${SITE_ORIGIN}/developers): quickstart, sandbox, OpenAPI, MCP, CLI
- [API documentation](${SITE_ORIGIN}/docs): auth, endpoints, examples
- [OpenAPI specification](${SITE_ORIGIN}/openapi.json): machine-readable operations
- [Authentication walkthrough](${SITE_ORIGIN}/auth.md): how agents obtain credentials
- [Agent instructions](${SITE_ORIGIN}/agents.md): when-to-use and calling conventions
- [Full index](${SITE_ORIGIN}/llms-full.txt): longer agent-oriented dump

## Product pages

- [Home](${SITE_ORIGIN}/): hackathon application portal overview
- [About](${SITE_ORIGIN}/about): what the product is
- [Contact](${SITE_ORIGIN}/contact): human and agent contact channels
- [Privacy](${SITE_ORIGIN}/privacy): data handling
- [Pricing](${SITE_ORIGIN}/pricing): free / MIT

## Machine discovery

- [MCP endpoint](${SITE_ORIGIN}/mcp): Streamable HTTP
- [MCP server card](${SITE_ORIGIN}/.well-known/mcp/server-card.json)
- [ARD catalog](${SITE_ORIGIN}/.well-known/ard.json)
- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog)
- [Sitemap](${SITE_ORIGIN}/sitemap.xml)
- [CLI on npm](https://www.npmjs.com/package/not-cal-hacks)

## Optional

- [Source repository](https://github.com/KarthikSubramanian07/not-cal-hacks)
- [Docs-scoped llms.txt](${SITE_ORIGIN}/docs/llms.txt)
- [API-scoped llms.txt](${SITE_ORIGIN}/api/llms.txt)
- [Developers-scoped llms.txt](${SITE_ORIGIN}/developers/llms.txt)
`
}

export function buildLlmsFullTxt(): string {
  return `${buildLlmsTxt()}

---

${HOME_MARKDOWN}

---

${DOCS_MARKDOWN}

---

${DEVELOPERS_MARKDOWN}
`
}
