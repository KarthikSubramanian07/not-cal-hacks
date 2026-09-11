import type { Context } from 'hono'
import type { z } from 'zod'
import { fieldErrors } from '../../shared/schemas'
import { ApiError } from './errors'

/**
 * Parses and validates a JSON request body.
 *
 * Every write route goes through this. The client validates the same schema for
 * fast feedback, but the client is not trusted: this is the copy that decides
 * what reaches the database.
 */
export async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw ApiError.badRequest('Expected a JSON body.')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw ApiError.badRequest('Some answers need another look.', fieldErrors(result.error))
  }
  return result.data
}

export function parseQuery<S extends z.ZodType>(c: Context, schema: S): z.infer<S> {
  const result = schema.safeParse(c.req.query())
  if (!result.success) {
    throw ApiError.badRequest('Those filters do not make sense.', fieldErrors(result.error))
  }
  return result.data
}
