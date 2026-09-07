import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getGHLToken(accountId: string): Promise<string> {
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
      [accountId]
    );
    if (rows.length && rows[0].access_token) return rows[0].access_token;
  } catch (e: any) {
    console.warn('[GHL Token] Error:', e.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');
    const productId = searchParams.get('product_id');

    let query = 'SELECT * FROM ai_agent_knowledge WHERE agent_id = $1';
    const values: any[] = [id];
    let pIdx = 2;
    if (folder) {
      query += ` AND folder = $${pIdx++}`;
      values.push(folder);
    }
    if (productId) {
      query += ` AND product_id = $${pIdx++}`;
      values.push(productId);
    }
    query += ' ORDER BY created_at DESC;';

    const { rows } = await pool.query(query, values);
    return NextResponse.json({ files: rows });
  } catch (err: any) {
    console.error('[Knowledge GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      folder = 'material_estudio', // 'material_estudio' | 'material_compartible'
      fileName,
      fileType = 'document',
      fileSize = 0,
      fileBase64,
      fileUrl,
      contentText = '',
      triggerRule = '',
      suggestedCaption = '',
      productId = null,
    } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'El nombre del archivo es requerido' }, { status: 400 });
    }

    // Obtener la subcuenta del agente
    const { rows: agentRows } = await pool.query('SELECT account_id FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    const accountId = agentRows.length ? agentRows[0].account_id : 'OS9czz85LUvBeljk8FEv';

    let cdnUrl = fileUrl || '';
    let storageUrl = fileUrl || '';

    // Si es material compartible y viene en base64, subirlo a GoHighLevel CDN para que tenga URL pública permanente
    if (folder === 'material_compartible' && fileBase64 && !cdnUrl.startsWith('http')) {
      try {
        const cleanBase64 = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
        const mimeType = fileType === 'video' ? 'video/mp4' : fileType === 'image' ? 'image/jpeg' : 'application/pdf';
        const buffer = Buffer.from(cleanBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        const form = new FormData();
        form.append('file', blob, fileName);
        form.append('name', fileName);
        form.append('altId', accountId);
        form.append('altType', 'location');

        const ghlToken = await getGHLToken(accountId);
        const upRes = await fetch('https://services.leadconnectorhq.com/medias/upload-file', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ghlToken}`,
            Version: '2021-07-28',
          },
          body: form,
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          cdnUrl = upData.url || '';
          storageUrl = cdnUrl;
        }
      } catch (upErr: any) {
        console.warn('[Knowledge Upload GHL] Warning:', upErr.message);
      }
    }

    const insertSql = `
      INSERT INTO ai_agent_knowledge (
        agent_id, folder, file_name, file_type, file_size, storage_url, cdn_url,
        content_text, trigger_rule, suggested_caption, product_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'processed')
      RETURNING *;
    `;

    const { rows } = await pool.query(insertSql, [
      id,
      folder,
      fileName,
      fileType,
      fileSize,
      storageUrl || 'local_storage',
      cdnUrl || null,
      contentText || '',
      triggerRule || null,
      suggestedCaption || null,
      productId || null,
    ]);

    return NextResponse.json({ file: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[Knowledge POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId es requerido' }, { status: 400 });
    }

    await pool.query('DELETE FROM ai_agent_knowledge WHERE id = $1 AND agent_id = $2;', [fileId, id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Knowledge DELETE] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
