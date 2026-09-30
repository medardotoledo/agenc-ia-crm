import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/products
 * Obtiene lista de productos o un producto por query param ?id=...
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
           a.name AS agent_name,
           a.role AS agent_role,
           a.avatar_url AS agent_avatar_url
         FROM ai_agent_products p
         LEFT JOIN ai_agents a ON a.id = p.agent_id
         WHERE p.id = $1`,
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

    // Listar todos los productos
    let query = `
      SELECT 
        p.*,
        a.name AS agent_name,
        a.role AS agent_role,
        a.avatar_url AS agent_avatar_url
      FROM ai_agent_products p
      LEFT JOIN ai_agents a ON a.id = p.agent_id
    `;
    const params: any[] = [];
    if (accountId && accountId !== 'undefined' && accountId !== 'null') {
      query += ` WHERE a.account_id = $1 `;
      params.push(accountId);
    }
    query += ` ORDER BY p.created_at DESC;`;

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
 * Crea un nuevo producto
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
    } = body;

    // Validaciones
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del producto es obligatorio' },
        { status: 400 }
      );
    }

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Debes seleccionar un agente' },
        { status: 400 }
      );
    }

    // Verificar que el agente existe en ai_agents
    const agentCheck = await client.query(
      'SELECT id, name FROM ai_agents WHERE id = $1',
      [agent_id]
    );

    if (agentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'producto';

    const result = await client.query(
      `INSERT INTO ai_agent_products
        (name, slug, short_description, irresistible_offer, target_triggers, price_range, knowledge_sheet, agent_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        name.trim(),
        slug,
        short_description?.trim() || null,
        irresistible_offer?.trim() || null,
        target_triggers?.trim() || null,
        price_range?.trim() || null,
        knowledge_sheet?.trim() || null,
        agent_id,
      ]
    );

    return NextResponse.json(
      { product: result.rows[0], message: 'Product created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Database error in /api/products POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
