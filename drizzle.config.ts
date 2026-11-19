import { defineConfig } from 'drizzle-kit'

// Drizzle owns the schema definition; `npm run db:generate` emits plain SQL into
// `drizzle/` and compiles it into the database Worker, which applies it to
// itself on start-up. No ORM-specific migration runtime ships to production.
export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  verbose: true,
  strict: true,
})
