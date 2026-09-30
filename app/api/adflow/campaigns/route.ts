import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Asegurar que la tabla adflow_campaigns existe en PostgreSQL
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS adflow_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id TEXT NOT NULL,
      product_id TEXT,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      budget_daily NUMERIC(10,2) DEFAULT 150.00,
      headline TEXT,
      body_text TEXT,
      cta_text TEXT DEFAULT 'Enviar WhatsApp',
      media_url TEXT,
      destination_url TEXT,
      targeting_interests JSONB DEFAULT '[]'::jsonb,
      targeting_locations JSONB DEFAULT '[]'::jsonb,
      spend NUMERIC(10,2) DEFAULT 0.00,
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      leads INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

export async function GET(req: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    let query = `SELECT * FROM adflow_campaigns`;
    const params: any[] = [];

    if (accountId && accountId !== 'undefined' && accountId !== 'null') {
      query += ` WHERE account_id = $1`;
      params.push(accountId);
    }

    query += ` ORDER BY created_at DESC;`;

    const { rows: campaigns } = await pool.query(query, params);
    return NextResponse.json({ campaigns });
  } catch (err: any) {
    console.error('[API AdFlow Campaigns GET] Error:', err.message);
    return NextResponse.json({ error: err.message, campaigns: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const {
      accountId = 'default',
      productId,
      name,
      platform = 'whatsapp',
      budgetDaily = 150,
      headline,
      bodyText,
      ctaText,
      mediaUrl,
      destinationUrl,
      targetingInterests = [],
      targetingLocations = [],
    } = body;

    const { rows } = await pool.query(`
      INSERT INTO adflow_campaigns (
        account_id, product_id, name, platform, status, budget_daily,
        headline, body_text, cta_text, media_url, destination_url,
        targeting_interests, targeting_locations, spend, impressions, clicks, leads
      )
      VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11, $12, 0, 0, 0, 0)
      RETURNING *;
    `, [
      accountId,
      productId || null,
      name || 'Nueva Campaña AdFlow',
      platform,
      budgetDaily,
      headline || '',
      bodyText || '',
      ctaText || 'Enviar WhatsApp',
      mediaUrl || null,
      destinationUrl || 'https://adflow.online',
      JSON.stringify(targetingInterests),
      JSON.stringify(targetingLocations),
    ]);

    return NextResponse.json({ campaign: rows[0], success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[API AdFlow Campaigns POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureTable();
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id y status son requeridos' }, { status: 400 });
    }

    const { rows } = await pool.query(`
      UPDATE adflow_campaigns
      SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING *;
    `, [status, id]);

    return NextResponse.json({ campaign: rows[0], success: true });
  } catch (err: any) {
    console.error('[API AdFlow Campaigns PATCH] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
