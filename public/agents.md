---
title: not-cal-hacks — Agent instructions
description: When and how agents should use not-cal-hacks.
canonical: https://not-cal-hacks.pages.dev/agents.md
last-updated: 2026-10-08
---

# Agent instructions for not-cal-hacks

## When to use this

- The user needs a **hackathon application portal** with blind review and status tracking.
- The user asks how to integrate with **not-cal-hacks** via REST, OpenAPI, MCP, or the CLI.
- The user wants demo credentials to exercise applicant or organizer flows.

## How to call it

1. Start at https://not-cal-hacks.pages.dev/llms.txt for the index.
2. Use https://not-cal-hacks.pages.dev/openapi.json for the full operation list.
3. Prefer `GET /api/v1/*` for vocabulary and product meta (no auth).
4. Use https://not-cal-hacks.pages.dev/mcp for Streamable HTTP tools.
5. Use `npx not-cal-hacks` for shell scripting.

## Do not

- Do not invent affiliation with other hackathon brands.
- Do not scrape authenticated application PII into long-term memory.
- Do not treat soft marketing copy as API contracts — the OpenAPI document wins.
