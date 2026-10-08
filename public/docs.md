---
title: not-cal-hacks — API docs
description: Authentication, public endpoints, and examples for the not-cal-hacks API.
canonical: https://not-cal-hacks.pages.dev/docs
last-updated: 2026-10-08
---

# not-cal-hacks API documentation

Base URL: `https://not-cal-hacks.pages.dev`

Machine-readable spec: [`/openapi.json`](https://not-cal-hacks.pages.dev/openapi.json) · also at [`/api/openapi.json`](https://not-cal-hacks.pages.dev/api/openapi.json)

## Authentication

- **Public read endpoints** under `/api/v1/*` and `/api/health` need no credentials.
- **Applicant and organizer endpoints** use an HTTP-only session cookie established by `POST /api/auth/signup`, `POST /api/auth/login`, or Google OAuth.
- Agents should read [`/auth.md`](https://not-cal-hacks.pages.dev/auth.md) for the full walkthrough.

## Public endpoints

```http
GET /api/health
GET /api/v1
GET /api/v1/meta
GET /api/v1/application-types
GET /api/v1/statuses
GET /api/v1/tracks
GET /api/v1/rubric
GET /openapi.json
```

Example:

```bash
curl -sS https://not-cal-hacks.pages.dev/api/v1/meta | jq
curl -sS -H 'Accept: application/json' https://not-cal-hacks.pages.dev/api/v1/application-types
```

## Authenticated endpoints (session cookie)

- `GET /api/auth/me` — current session user
- `POST /api/applications` — start an application
- `GET /api/applications` — list your applications
- `PATCH /api/applications/:id` — save draft answers
- `POST /api/applications/:id/submit` — lock and submit
- Organizer routes under `/api/admin/*` require the organizer role

Error bodies are always JSON:

```json
{ "error": { "code": "not_found", "message": "…" } }
```

## MCP

Streamable HTTP MCP lives at [`/mcp`](https://not-cal-hacks.pages.dev/mcp) (also advertised at `/.well-known/mcp`). Tools wrap the public catalog endpoints so agents can list application types, tracks, rubric criteria, and fetch docs without a browser.

## CLI

```bash
npx not-cal-hacks health
npx not-cal-hacks meta
npx not-cal-hacks openapi
```

## Sandbox

Use the seeded demo accounts on the live site (documented on [/developers](https://not-cal-hacks.pages.dev/developers)). Production preview deployments without a database return HTTP 503 for authenticated routes; public `/api/v1` catalog routes still answer.
