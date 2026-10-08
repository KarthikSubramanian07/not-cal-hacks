---
title: not-cal-hacks — Authentication for agents
description: How agents authenticate to the not-cal-hacks API.
canonical: https://not-cal-hacks.pages.dev/auth.md
last-updated: 2026-10-08
---

# Authentication for agents

## Summary

- Public catalog endpoints under `/api/v1/*`, `/api/health`, `/openapi.json`, and `/mcp` tools that only read catalog data require **no authentication**.
- Applicant and organizer JSON APIs require a **session cookie** minted by signup, login, or Google OAuth.
- There is no paid API-key product. The live demo accounts are the sandbox.

## Obtaining a session

```bash
curl -sS -c cookies.txt -X POST https://not-cal-hacks.pages.dev/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com","password":"a-long-password","fullName":"Agent Runner"}'

curl -sS -b cookies.txt https://not-cal-hacks.pages.dev/api/auth/me
```

Or sign in with an existing account:

```bash
curl -sS -c cookies.txt -X POST https://not-cal-hacks.pages.dev/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hacker@notcalhacks.dev","password":"demo1234"}'
```

Send the `nch_session` cookie on subsequent requests. Protected routes return `401` with a JSON error body when the cookie is missing or expired.

## OAuth

Optional Sign in with Google is available in the browser when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. Protected-resource metadata is published at `/.well-known/oauth-protected-resource` for discovery. Session cookies remain the credential presented to the API after the browser completes the redirect.

## Scopes and roles

Roles are `applicant` and `organizer`. Organizer routes under `/api/admin/*` reject applicants with `403`. There is no fine-grained OAuth scope product yet; least privilege means using the public catalog when you do not need private application data.
