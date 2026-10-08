import { Hono } from 'hono'
import { ApiError } from './lib/errors'
import { openApiResponse } from './routes/public'
import { loadUser } from './middleware/auth'
import adminRoutes from './routes/admin'
import applicationRoutes from './routes/applications'
import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>().basePath('/api')

/** Routes that must work on database-less preview deployments. */
function isPublicCatalogPath(path: string): boolean {
  return (
    path === '/api/health' ||
    path === '/api/openapi.json' ||
    path === '/api/v1' ||
    path.startsWith('/api/v1/')
  )
}

/**
 * Hardening headers. The app serves no third-party script and no inline script
 * other than the prerendered bootstrap, so the policy can stay tight.
 */
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  // Public catalog may be cached briefly; everything else is private.
  if (!c.res.headers.has('Cache-Control')) {
    if (isPublicCatalogPath(c.req.path)) {
      c.header('Cache-Control', 'public, max-age=60')
      c.header('Access-Control-Allow-Origin', '*')
    } else {
      c.header('Cache-Control', 'private, no-store')
    }
  }
})

/**
 * Pull request previews ship without a database, so the site can be looked at
 * but the API cannot touch any rows. Public catalog routes still answer so
 * agents can discover the surface from a preview URL.
 */
app.use('*', async (c, next) => {
  if (c.env.DB || isPublicCatalogPath(c.req.path)) return next()
  const error = new ApiError(503, 'server_error', 'This preview has no database.')
  return c.json(error.toBody(), 503)
})

app.use('*', loadUser)

app.route('/auth', authRoutes)
app.route('/applications', applicationRoutes)
app.route('/admin', adminRoutes)
app.route('/v1', publicRoutes)

app.get('/health', (c) => c.json({ ok: true, service: c.env.APP_NAME ?? 'not-cal-hacks' }))

app.get('/openapi.json', () => openApiResponse())

app.notFound((c) => c.json(ApiError.notFound('No route at that path.').toBody(), 404))

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(err.toBody(), err.status as 400)
  }
  // Anything unplanned is logged for the operator and generic for the caller.
  console.error('unhandled', err)
  return c.json(new ApiError(500, 'server_error', 'Something broke on our side.').toBody(), 500)
})

export default app
