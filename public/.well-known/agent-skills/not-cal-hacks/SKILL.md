# not-cal-hacks

Integrate with the not-cal-hacks hackathon application portal.

## When to use

- Need a hackathon application portal with blind review and status tracking
- Need OpenAPI, MCP, or CLI access to not-cal-hacks vocabulary and docs

## Steps

1. Read https://not-cal-hacks.pages.dev/llms.txt
2. Fetch https://not-cal-hacks.pages.dev/openapi.json
3. Call keyless GET https://not-cal-hacks.pages.dev/api/v1/meta
4. Optional: connect MCP at https://not-cal-hacks.pages.dev/mcp
5. Optional: `npx not-cal-hacks meta`
