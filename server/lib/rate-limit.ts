import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { ApiError } from './errors'

/**
 * Fixed-window rate limiting backed by D1.
 *
 * An in-memory counter would be worse than nothing here: Workers isolates are
 * created and destroyed per colo, so an attacker gets a fresh allowance with
 * every cold start. Storing the counter makes the limit actually mean something
 * at the cost of one write per attempt, which is acceptable on auth routes.
 */
export async function consumeRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now()
  const reset = now + windowMs

  const rows = await db.all<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, ${reset})
    on conflict(key) do update set
      count = case when rate_limits.reset_at <= ${now} then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= ${now} then ${reset} else rate_limits.reset_at end
    returning count
  `)

  const count = rows[0]?.count ?? 1
  if (count > limit) {
    throw new ApiError(429, 'rate_limited', 'Too many attempts. Wait a few minutes and try again.')
  }
}

/** Best-effort client identifier, used only for rate limiting. */
export function clientKey(headers: Headers): string {
  return headers.get('CF-Connecting-IP') ?? headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown'
}
