import { applyD1Migrations, env } from 'cloudflare:test'

// Every test worker starts from the same schema the deployment uses. Running
// the real migrations rather than a fixture means a migration that would break
// production breaks the suite first.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
