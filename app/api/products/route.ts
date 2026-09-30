import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/products
 * Obtiene lista de productos con sus agentes asignados (Muchos a Muchos)
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const accountId = searchParams.get('accountId');

    if (id) {
      const result = await client.query(
        `SELECT 
           p.*,
           COALESCE(a_prim.name, a_leg.name, 'Agente Asignado') AS agent_name,
           COALESCE(a_prim.role, a_leg.role) AS agent_role,
           COALESCE(a_prim.avatar_url, a_leg.avatar_url) AS agent_avatar_url,
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
         WHERE p.id = $1
         GROUP BY p.id, a_prim.id, a_leg.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ product: result.rows[0] }, { status: 200 });
    }

    // Listar todos los productos con array de agentes asignados
    let query = `
      SELECT 
        p.*,
        COALESCE(a_prim.name, a_leg.name, 'Agente Asignado') AS agent_name,
        COALESCE(a_prim.role, a_leg.role) AS agent_role,
        COALESCE(a_prim.avatar_url, a_leg.avatar_url) AS agent_avatar_url,
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
      query += ` WHERE (p.account_id = $1 OR p.account_id = 'default' OR p.account_id IS NULL) `;
      params.push(accountId);
    }
    query += ` GROUP BY p.id, a_prim.id, a_leg.id ORDER BY p.created_at DESC;`;

    const result = await client.query(query, params);
    return NextResponse.json({ products: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Database error in /api/products GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * POST /api/products
 * Crea un nuevo producto y asigna uno o varios agentes
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      name,
      short_description,
      irresistible_offer,
      target_triggers,
      price_range,
      knowledge_sheet,
      agent_id,
      assigned_agent_ids,
      primary_agent_id,
      account_id,
    } = body;

    // Validaciones
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del producto es obligatorio' },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'producto';

    // Determinar agente principal
    let effectivePrimaryAgentId = primary_agent_id || agent_id || null;
    if (!effectivePrimaryAgentId && Array.isArray(assigned_agent_ids) && assigned_agent_ids.length > 0) {
      const first = assigned_agent_ids[0];
      effectivePrimaryAgentId = typeof first === 'string' ? first : first.agent_id;
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO ai_agent_products
        (account_id, name, slug, short_description, irresistible_offer, target_triggers, price_range, knowledge_sheet, agent_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        account_id || 'default',
        name.trim(),
        slug,
        short_description?.trim() || null,
        irresistible_offer?.trim() || null,
        target_triggers?.trim() || null,
        price_range?.trim() || null,
        knowledge_sheet?.trim() || null,
        effectivePrimaryAgentId,
      ]
    );

    const createdProduct = result.rows[0];

    // Asignar agentes en la tabla intermedia
    if (Array.isArray(assigned_agent_ids) && assigned_agent_ids.length > 0) {
      for (const item of assigned_agent_ids) {
        const currentAgentId = typeof item === 'string' ? item : item.agent_id;
        const isPrimary = typeof item === 'object' && item.is_primary !== undefined 
          ? Boolean(item.is_primary) 
          : currentAgentId === effectivePrimaryAgentId;

        if (currentAgentId) {
          await client.query(
            `INSERT INTO ai_agent_product_assignments (product_id, agent_id, is_primary)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, agent_id) DO NOTHING`,
            [createdProduct.id, currentAgentId, isPrimary]
          );
        }
      }
    } else if (effectivePrimaryAgentId) {
      await client.query(
        `INSERT INTO ai_agent_product_assignments (product_id, agent_id, is_primary)
         VALUES ($1, $2, true)
         ON CONFLICT (product_id, agent_id) DO NOTHING`,
        [createdProduct.id, effectivePrimaryAgentId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json(
      { product: createdProduct, message: 'Product created successfully' },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Database error in /api/products POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
