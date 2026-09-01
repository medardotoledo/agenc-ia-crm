import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 12000,
})

try {
  await client.connect()
  const r = await client.query('select version()')
  console.log('CONECTADO ✅ —', r.rows[0].version.slice(0, 60))
  await client.end()
} catch (e) {
  console.error('FALLO ❌ —', e.code ?? '', e.message)
  process.exit(1)
}
