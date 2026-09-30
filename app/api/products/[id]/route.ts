import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/products/[id]
 * Obtiene un producto específico con su lista de agentes asignados (Muchos a Muchos)
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
 * Actualiza un producto y sincroniza sus agentes asignados (Muchos a Muchos)
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
      assigned_agent_ids,
      primary_agent_id,
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

    // Verificar que el producto existe
    const productCheck = await client.query(
      'SELECT id, agent_id FROM ai_agent_products WHERE id = $1',
      [id]
    );

    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Determinar el agente principal
    let effectivePrimaryAgentId = primary_agent_id || agent_id || null;

    // Procesar asignaciones Muchos a Muchos si se proporcionaron
    if (Array.isArray(assigned_agent_ids)) {
      await client.query('BEGIN');

      // Limpiar asignaciones previas
      await client.query(
        'DELETE FROM ai_agent_product_assignments WHERE product_id = $1',
        [id]
      );

      // Si no se especificó primary pero hay agentes, el primero es primary
      if (!effectivePrimaryAgentId && assigned_agent_ids.length > 0) {
        const first = assigned_agent_ids[0];
        effectivePrimaryAgentId = typeof first === 'string' ? first : first.agent_id;
      }

      for (const item of assigned_agent_ids) {
        const currentAgentId = typeof item === 'string' ? item : item.agent_id;
        const isPrimary = typeof item === 'object' && item.is_primary !== undefined 
          ? Boolean(item.is_primary) 
          : currentAgentId === effectivePrimaryAgentId;

        if (currentAgentId) {
          await client.query(
            `INSERT INTO ai_agent_product_assignments (product_id, agent_id, is_primary)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, agent_id) DO UPDATE SET is_primary = $3`,
            [id, currentAgentId, isPrimary]
          );
        }
      }

      await client.query('COMMIT');
    } else if (agent_id) {
      // Formato legacy de un solo agente
      await client.query(
        `INSERT INTO ai_agent_product_assignments (product_id, agent_id, is_primary)
         VALUES ($1, $2, true)
         ON CONFLICT (product_id, agent_id) DO UPDATE SET is_primary = true`,
        [id, agent_id]
      );
      effectivePrimaryAgentId = agent_id;
    }

    const result = await client.query(
      `UPDATE ai_agent_products
       SET name = $1,
           short_description = $2,
           irresistible_offer = $3,
           target_triggers = $4,
           price_range = $5,
           knowledge_sheet = $6,
           agent_id = COALESCE($7, agent_id),
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
        effectivePrimaryAgentId,
        id,
      ]
    );

    return NextResponse.json(
      { product: result.rows[0], message: 'Product updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
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
 * Elimina un producto y sus asignaciones en cascada
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
