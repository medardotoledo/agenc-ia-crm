import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ghl_installations (
        location_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('location_id');
    if (!locationId) return NextResponse.json({ error: 'Falta location_id' }, { status: 400 });

    await ensureTable();
    const { rows } = await pool.query('SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;', [locationId]);
    return NextResponse.json({ token: rows[0]?.access_token || '' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const location_id = body.location_id;
    const access_token = body.access_token;
    if (!location_id || !access_token) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    await ensureTable();
    await pool.query(`
      INSERT INTO ghl_installations (location_id, access_token, refresh_token, updated_at)
      VALUES ($1, $2, '', CURRENT_TIMESTAMP)
      ON CONFLICT (location_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        updated_at = CURRENT_TIMESTAMP
    `, [location_id, access_token]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
