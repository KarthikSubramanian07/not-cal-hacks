---
title: not-cal-hacks — Developer portal
description: Quickstart, sandbox, OpenAPI, MCP, and CLI for the not-cal-hacks hackathon application portal.
canonical: https://not-cal-hacks.pages.dev/developers
last-updated: 2026-10-08
---

# not-cal-hacks developer portal

Build against the hackathon application portal without reverse-engineering the UI.

## Quickstart (two minutes)

1. Read the public meta document: `curl -sS https://not-cal-hacks.pages.dev/api/v1/meta`
2. Fetch the OpenAPI document: `curl -sS https://not-cal-hacks.pages.dev/openapi.json`
3. Open the human docs: https://not-cal-hacks.pages.dev/docs
4. Optional MCP: point a Streamable HTTP client at https://not-cal-hacks.pages.dev/mcp
5. Optional CLI: `npx not-cal-hacks meta`

## Sandbox environment

The production deployment at https://not-cal-hacks.pages.dev ships seeded demo accounts. They are the sandbox — nothing you do to them is durable across reseeds.

| Role | Email | Password |
| --- | --- | --- |
| Organizer | organizer@notcalhacks.dev | demo1234 |
| Hacker | hacker@notcalhacks.dev | demo1234 |
| Judge | judge@notcalhacks.dev | demo1234 |

Public catalog endpoints need no key. Authenticated flows use session cookies from signup/login. There is no paid API key tier; the free sandbox is the whole surface.

## API keys

Read-only public routes are keyless. Session cookies act as bearer credentials for applicant and organizer routes after login. See [/auth.md](https://not-cal-hacks.pages.dev/auth.md).

## Surfaces

- REST + OpenAPI — https://not-cal-hacks.pages.dev/openapi.json
- Docs — https://not-cal-hacks.pages.dev/docs
- MCP — https://not-cal-hacks.pages.dev/mcp
- CLI package — `not-cal-hacks` on npm
- Agent index — https://not-cal-hacks.pages.dev/llms.txt
- Source — https://github.com/KarthikSubramanian07/not-cal-hacks

## Application vocabulary

- Types: hacker, judge
- Statuses: draft, submitted, under_review, accepted, waitlisted, rejected
- Tracks: AI, Health, Fintech, Climate, Hardware, Open
- Rubric: Technical, Passion, Fit
