import app from '../../server/app'
import { withDatabase } from '../../server/db/durable'
import type { DatabaseNamespace } from '../../server/db/protocol'
import type { Env } from '../../server/types'

/** What Pages actually binds: the database arrives as a Durable Object namespace. */
type PagesEnv = Omit<Env, 'DB'> & { DATABASE?: DatabaseNamespace }

/**
 * The single entry point for the API.
 *
 * Cloudflare Pages routes every `/api/*` request here; Hono does the rest. The
 * Worker and the static site ship as one deployment, so there is no separate
 * API origin, no CORS configuration, and no way for the two halves to drift to
 * different versions.
 */
export const onRequest: PagesFunction<PagesEnv> = (context) =>
  app.fetch(context.request, withDatabase(context.env), {
    waitUntil: context.waitUntil.bind(context),
    passThroughOnException: context.passThroughOnException.bind(context),
    props: {},
  })
