/**
 * Production-safe migration runner.
 *
 * 1. Removes dev-mode rows from payload_migrations (batch = -1). These are
 *    Drizzle auto-push metadata from `next dev` — not application data.
 * 2. Runs `payload migrate` to apply any pending versioned migrations.
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

async function removeDevMigrationRecords(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set — cannot run migrations.')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const tableCheck = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'payload_migrations'
      ) AS exists
    `)

    if (!tableCheck.rows[0]?.exists) {
      console.log('payload_migrations table not found — first deploy, nothing to clean.')
      return
    }

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM payload_migrations WHERE batch = -1`,
    )
    const count = Number(countResult.rows[0]?.count ?? 0)

    if (count === 0) {
      console.log('No dev-mode migration records (batch -1) found.')
      return
    }

    await client.query(`DELETE FROM payload_migrations WHERE batch = -1`)
    console.log(
      `Removed ${count} dev-mode record(s) from payload_migrations (batch -1). Application data was not modified.`,
    )
  } finally {
    await client.end()
  }
}

function runPayloadMigrate(): void {
  console.log('Running payload migrate...')
  const result = spawnSync('payload', ['migrate'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function main(): Promise<void> {
  await removeDevMigrationRecords()
  runPayloadMigrate()
  console.log('Migrations complete.')
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
