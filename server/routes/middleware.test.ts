import { describe, expect, it } from 'vitest'
import { onRequest } from '../../functions/_middleware'

const SHELL = '<!doctype html><html><body><div id="root"></div></body></html>'

/** Runs the edge middleware with a stand-in for the static asset server. */
async function visit(path: string, headers: Record<string, string>, asset: () => Response) {
  const request = new Request(`https://not-cal-hacks.pages.dev${path}`, { headers })
  const context = {
    request,
    env: { ASSETS: { fetch: async () => asset() } },
    next: async () => new Response('next', { status: 200 }),
  } as unknown as Parameters<typeof onRequest>[0]
  return onRequest(context)
}

describe('the app shell', () => {
  it('serves the shell for an app route', async () => {
    const response = await visit('/login', { accept: 'text/html' }, () => new Response(SHELL))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(SHELL)
    expect(response.headers.get('Link')).toContain('rel="sitemap"')
  })

  it('passes a 304 through instead of sending an empty 200', async () => {
    const response = await visit(
      '/login',
      { accept: 'text/html', 'if-none-match': '"abc"' },
      () => new Response(null, { status: 304, headers: { ETag: '"abc"' } }),
    )
    expect(response.status).toBe(304)
    expect(response.headers.get('ETag')).toBe('"abc"')
    expect(await response.text()).toBe('')
  })
})
