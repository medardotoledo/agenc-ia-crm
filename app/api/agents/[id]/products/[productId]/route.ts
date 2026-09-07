import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;

    const { rows: prodRows } = await pool.query(
      'SELECT * FROM ai_agent_products WHERE id = $1 AND agent_id = $2 LIMIT 1;',
      [productId, id]
    );

    if (!prodRows.length) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const product = prodRows[0];

    const { rows: files } = await pool.query(
      'SELECT * FROM ai_agent_knowledge WHERE product_id = $1 ORDER BY created_at ASC;',
      [productId]
    );

    return NextResponse.json({
      product,
      studyFiles: files.filter((f) => f.folder === 'material_estudio'),
      shareableFiles: files.filter((f) => f.folder === 'material_compartible'),
    });
  } catch (err: any) {
    console.error('[API Product Detail GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;
    const body = await req.json();
    const { name, short_description, target_triggers, price_range, knowledge_sheet } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (short_description !== undefined) { updates.push(`short_description = $${idx++}`); values.push(short_description.trim()); }
    if (target_triggers !== undefined) { updates.push(`target_triggers = $${idx++}`); values.push(target_triggers.trim()); }
    if (price_range !== undefined) { updates.push(`price_range = $${idx++}`); values.push(price_range.trim()); }
    if (knowledge_sheet !== undefined) { updates.push(`knowledge_sheet = $${idx++}`); values.push(knowledge_sheet.trim()); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(productId, id);

    const { rows } = await pool.query(`
      UPDATE ai_agent_products
      SET ${updates.join(', ')}
      WHERE id = $${idx++} AND agent_id = $${idx}
      RETURNING *;
    `, values);

    if (!rows.length) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ product: rows[0], success: true });
  } catch (err: any) {
    console.error('[API Product Detail PUT] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;
    await pool.query('DELETE FROM ai_agent_products WHERE id = $1 AND agent_id = $2;', [productId, id]);
    return NextResponse.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (err: any) {
    console.error('[API Product Detail DELETE] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
