import { Hono } from 'hono'
import { ApiError } from './lib/errors'
import { loadUser } from './middleware/auth'
import adminRoutes from './routes/admin'
import applicationRoutes from './routes/applications'
import authRoutes from './routes/auth'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>().basePath('/api')

/**
 * Hardening headers. The app serves no third-party script and no inline script
 * other than the prerendered bootstrap, so the policy can stay tight.
 */
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  // API responses are per-user and must never be cached by a shared proxy.
  if (!c.res.headers.has('Cache-Control')) {
    c.header('Cache-Control', 'private, no-store')
  }
})

app.use('*', loadUser)

app.route('/auth', authRoutes)
app.route('/applications', applicationRoutes)
app.route('/admin', adminRoutes)

app.get('/health', (c) => c.json({ ok: true, service: c.env.APP_NAME ?? 'not-cal-hacks' }))

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
