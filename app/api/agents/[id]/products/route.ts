import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { rows: products } = await pool.query(`
      SELECT 
        p.*,
        COUNT(CASE WHEN k.folder = 'material_estudio' THEN 1 END) AS study_files_count,
        COUNT(CASE WHEN k.folder = 'material_compartible' THEN 1 END) AS shareable_files_count,
        (p.knowledge_sheet IS NOT NULL AND LENGTH(p.knowledge_sheet) > 50) AS has_knowledge_sheet
      FROM ai_agent_products p
      LEFT JOIN ai_agent_knowledge k ON k.product_id = p.id
      WHERE p.agent_id = $1
      GROUP BY p.id
      ORDER BY p.display_order ASC, p.created_at ASC;
    `, [id]);

    return NextResponse.json({ products });
  } catch (err: any) {
    console.error('[API Products GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, short_description, target_triggers, price_range } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del producto es obligatorio' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'producto';

    const { rows } = await pool.query(`
      INSERT INTO ai_agent_products (
        agent_id, name, slug, short_description, target_triggers, price_range
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [
      id,
      name.trim(),
      slug,
      short_description?.trim() || '',
      target_triggers?.trim() || '',
      price_range?.trim() || '',
    ]);

    return NextResponse.json({ product: rows[0], success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[API Products POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
