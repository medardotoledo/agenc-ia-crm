// Utilidad: corre una consulta SQL ad-hoc contra el espejo.
// Uso: node --env-file=.env scripts/db-query.mjs "select count(*) from contacts"
import pg from 'pg'

const sql = process.argv[2]
if (!sql) { console.error('Falta el SQL como argumento'); process.exit(1) }

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()
const r = await c.query(sql)
console.log(JSON.stringify(r.rows ?? r.rowCount, null, 2))
if (r.rowCount !== null && !r.rows?.length) console.log('filas afectadas:', r.rowCount)
await c.end()
