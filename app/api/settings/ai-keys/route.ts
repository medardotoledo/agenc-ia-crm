import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_ai_keys (
        account_id TEXT PRIMARY KEY,
        gemini_key TEXT,
        anthropic_key TEXT,
        openai_key TEXT,
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
    const accountId = searchParams.get('account_id') || 'default';

    await ensureTable();
    const { rows } = await pool.query(
      'SELECT gemini_key, anthropic_key, openai_key FROM account_ai_keys WHERE account_id = $1 LIMIT 1;',
      [accountId]
    );

    const row = rows[0] || {};
    return NextResponse.json({
      gemini_key: row.gemini_key || '',
      anthropic_key: row.anthropic_key || '',
      openai_key: row.openai_key || '',
      has_gemini: Boolean(row.gemini_key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      has_anthropic: Boolean(row.anthropic_key || process.env.ANTHROPIC_API_KEY),
      has_openai: Boolean(row.openai_key || process.env.OPENAI_API_KEY),
    });
  } catch (error: any) {
    console.error('[AI Keys Settings GET] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountId = body.account_id || 'default';
    const { gemini_key, anthropic_key, openai_key } = body;

    await ensureTable();
    await pool.query(`
      INSERT INTO account_ai_keys (account_id, gemini_key, anthropic_key, openai_key, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (account_id) DO UPDATE SET
        gemini_key = COALESCE(EXCLUDED.gemini_key, account_ai_keys.gemini_key),
        anthropic_key = COALESCE(EXCLUDED.anthropic_key, account_ai_keys.anthropic_key),
        openai_key = COALESCE(EXCLUDED.openai_key, account_ai_keys.openai_key),
        updated_at = CURRENT_TIMESTAMP;
    `, [accountId, gemini_key ?? '', anthropic_key ?? '', openai_key ?? '']);

    return NextResponse.json({ success: true, message: 'Llaves de IA guardadas correctamente' });
  } catch (error: any) {
    console.error('[AI Keys Settings POST] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
