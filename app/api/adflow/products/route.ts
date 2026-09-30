import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    let query = `
      SELECT 
        p.id,
        p.agent_id,
        p.name,
        p.slug,
        p.short_description,
        p.target_triggers,
        p.price_range,
        p.knowledge_sheet,
        p.irresistible_offer,
        p.market_intel_data,
        p.offer_interview_data,
        p.created_at,
        a.name AS agent_name,
        a.role AS agent_role,
        a.avatar_url AS agent_avatar_url,
        a.target_channel AS agent_channel
      FROM ai_agent_products p
      JOIN ai_agents a ON a.id = p.agent_id
    `;

    const params: any[] = [];
    if (accountId && accountId !== 'undefined' && accountId !== 'null') {
      query += ` WHERE a.account_id = $1 `;
      params.push(accountId);
    }

    query += ` ORDER BY p.created_at DESC;`;

    const { rows: products } = await pool.query(query, params);

    return NextResponse.json({ products });
  } catch (err: any) {
    console.error('[API AdFlow Products GET] Error:', err.message);
    return NextResponse.json({ error: err.message, products: [] }, { status: 500 });
  }
}
