# AGENTS.md

Guidance for coding agents working in this repository.

## Product

not-cal-hacks is a hackathon application portal: applicants file hacker/judge applications; organizers review blind against a shared rubric.

## Agent-facing surface (do not regress)

- Real HTTP 404 for unknown paths (`functions/_middleware.ts`) — never soft-404 with the SPA shell.
- Homepage Markdown negotiation: `Accept: text/markdown` → `text/markdown` + `Vary: Accept`.
- Public catalog: `/api/v1/*`, `/openapi.json`, `/mcp`, `/llms.txt`, trust pages, `/developers`, `/docs`.
- Sync static discovery files with `npm run sync:agent` before build.

## Verify

```bash
npm test
npm run build
curl -sS -i -H 'Accept: text/markdown' http://127.0.0.1:8788/ | head
curl -sS -i http://127.0.0.1:8788/nope | head
```

## Do not

- Put private intent, personal names, or tooling attribution into public pages or commits.
- Reintroduce `/* /index.html 200` in `_redirects`.
