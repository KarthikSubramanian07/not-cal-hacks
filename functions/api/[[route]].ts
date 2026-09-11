import app from '../../server/app'
import type { Env } from '../../server/types'

/**
 * The single entry point for the API.
 *
 * Cloudflare Pages routes every `/api/*` request here; Hono does the rest. The
 * Worker and the static site ship as one deployment, so there is no separate
 * API origin, no CORS configuration, and no way for the two halves to drift to
 * different versions.
 */
export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, context.env, {
    waitUntil: context.waitUntil.bind(context),
    passThroughOnException: context.passThroughOnException.bind(context),
    props: {},
  })
