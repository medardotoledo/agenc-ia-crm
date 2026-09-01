// Corre las migraciones de supabase/migrations en orden alfabético.
// Uso: node --env-file=.env scripts/db-migrate.mjs
import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const dir = join(import.meta.dirname, '..', 'supabase', 'migrations')
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

for (const f of files) {
  const sql = await readFile(join(dir, f), 'utf8')
  process.stdout.write(`→ ${f} … `)
  try {
    await client.query(sql)
    console.log('OK ✅')
  } catch (e) {
    console.log(`ERROR ❌  ${e.message}`)
    await client.end()
    process.exit(1)
  }
}

const counts = await client.query(`
  select 'contacts' t, count(*) n from contacts
  union all select 'opportunities', count(*) from opportunities
  union all select 'notes', count(*) from notes
  union all select 'conversations', count(*) from conversations
  union all select 'messages', count(*) from messages
  union all select 'appointments', count(*) from appointments
  union all select 'users', count(*) from users
  union all select 'stages', count(*) from stages
`)
console.table(counts.rows)
await client.end()
