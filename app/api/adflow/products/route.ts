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
        COALESCE(a_prim.name, a_leg.name, 'Agente Asignado') AS agent_name,
        COALESCE(a_prim.role, a_leg.role) AS agent_role,
        COALESCE(a_prim.avatar_url, a_leg.avatar_url) AS agent_avatar_url,
        COALESCE(a_prim.target_channel, a_leg.target_channel, 'whatsapp') AS agent_channel,
        COALESCE(
          json_agg(
            json_build_object(
              'agent_id', a_all.id,
              'name', a_all.name,
              'role', a_all.role,
              'avatar_url', a_all.avatar_url,
              'is_primary', asgn.is_primary
            )
          ) FILTER (WHERE a_all.id IS NOT NULL),
          '[]'
        ) AS assigned_agents
      FROM ai_agent_products p
      LEFT JOIN ai_agent_product_assignments asgn ON asgn.product_id = p.id
      LEFT JOIN ai_agents a_all ON a_all.id = asgn.agent_id
      LEFT JOIN ai_agents a_prim ON a_prim.id = (
        SELECT agent_id FROM ai_agent_product_assignments WHERE product_id = p.id AND is_primary = true LIMIT 1
      )
      LEFT JOIN ai_agents a_leg ON a_leg.id = p.agent_id
    `;

    const params: any[] = [];
    if (accountId && accountId !== 'undefined' && accountId !== 'null') {
      query += ` WHERE p.account_id = $1 `;
      params.push(accountId);
    }

    query += ` GROUP BY p.id, a_prim.id, a_leg.id ORDER BY p.created_at DESC;`;

    const { rows: products } = await pool.query(query, params);

    return NextResponse.json({ products });
  } catch (err: any) {
    console.error('[API AdFlow Products GET] Error:', err.message);
    return NextResponse.json({ error: err.message, products: [] }, { status: 500 });
  }
}
