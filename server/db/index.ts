import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export const getDb = (d1: D1Database) => drizzle(d1, { schema, casing: 'snake_case' })

export type Db = ReturnType<typeof getDb>

export { schema }

/** Short, URL-safe, sortable-enough identifier for rows we create. */
export const newId = () => crypto.randomUUID()

export { transitionStatus, type StatusTransition } from './transition'
