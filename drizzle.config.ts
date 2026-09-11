import { defineConfig } from 'drizzle-kit'

// Drizzle owns the schema definition; `npm run db:generate` emits plain SQL into
// `drizzle/`, which is what both `wrangler d1 migrations apply` and the test
// harness replay. No ORM-specific migration runtime ships to production.
export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  verbose: true,
  strict: true,
})
