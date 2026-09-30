import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/products/[id]
 * Obtiene un producto específico por ID con info del agente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('Database error in /api/products/[id] GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * PUT /api/products/[id]
 * Actualiza un producto existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
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

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

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

    // Verificar que el producto existe
    const productCheck = await client.query(
      'SELECT id FROM ai_agent_products WHERE id = $1',
      [id]
    );

    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verificar que el agente existe en ai_agents
    const agentCheck = await client.query(
      'SELECT id FROM ai_agents WHERE id = $1',
      [agent_id]
    );

    if (agentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    const result = await client.query(
      `UPDATE ai_agent_products
       SET name = $1,
           short_description = $2,
           irresistible_offer = $3,
           target_triggers = $4,
           price_range = $5,
           knowledge_sheet = $6,
           agent_id = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name.trim(),
        short_description?.trim() || null,
        irresistible_offer?.trim() || null,
        target_triggers?.trim() || null,
        price_range?.trim() || null,
        knowledge_sheet?.trim() || null,
        agent_id,
        id,
      ]
    );

    return NextResponse.json(
      { product: result.rows[0], message: 'Product updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database error in /api/products/[id] PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/products/[id]
 * Elimina un producto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

    const result = await client.query(
      'DELETE FROM ai_agent_products WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database error in /api/products/[id] DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
