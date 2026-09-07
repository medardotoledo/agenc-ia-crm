import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function cleanHtmlToText(html: string): { title: string; text: string } {
  // 1. Extraer título
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : '';

  // 2. Limpiar scripts, styles, svgs, comentarios, nav, footer, header
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  // 3. Convertir etiquetas semánticas a saltos de línea y markdown
  cleaned = cleaned
    .replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, '\n\n# $1\n')
    .replace(/<h[3-4][^>]*>([\s\S]*?)<\/h[3-4]>/gi, '\n\n## $1\n')
    .replace(/<h[5-6][^>]*>([\s\S]*?)<\/h[5-6]>/gi, '\n\n### $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, '\n$1')
    .replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, ' | $1')
    .replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, ' | **$1**')
    .replace(/<[^>]+>/g, ' '); // Eliminar resto de tags

  // 4. Decodificar entidades HTML comunes
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ');

  // 5. Normalizar espacios y saltos de línea
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return { title, text: cleaned };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { url, productId, folder = 'material_estudio' } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'La URL es obligatoria' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim());
    } catch {
      return NextResponse.json({ error: 'La URL proporcionada no tiene un formato válido' }, { status: 400 });
    }

    // 1. Fetch de la página web con timeout y headers de navegador estándar
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let html = '';
    try {
      const resp = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        return NextResponse.json({
          error: `No se pudo acceder a la página web (HTTP ${resp.status}). Verifica que la URL sea pública.`,
        }, { status: 400 });
      }

      html = await resp.text();
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'La página web tardó más de 15 segundos en responder (Timeout).' }, { status: 408 });
      }
      return NextResponse.json({ error: `Error de conexión: ${fetchErr.message}` }, { status: 500 });
    }

    // 2. Extraer y limpiar contenido
    const { title, text } = cleanHtmlToText(html);

    if (!text || text.length < 50) {
      return NextResponse.json({
        error: 'No se pudo extraer contenido de texto significativo de esta página web.',
      }, { status: 422 });
    }

    const fileName = title ? `🌐 ${title.substring(0, 70)}` : `🌐 ${parsedUrl.hostname}${parsedUrl.pathname.substring(0, 30)}`;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // 3. Guardar en ai_agent_knowledge
    const insertSql = `
      INSERT INTO ai_agent_knowledge (
        agent_id, folder, file_name, file_type, file_size, storage_url, cdn_url,
        content_text, trigger_rule, product_id, status
      ) VALUES ($1, $2, $3, 'web_url', $4, $5, $5, $6, $7, $8, 'processed')
      RETURNING *;
    `;

    const { rows } = await pool.query(insertSql, [
      id,
      folder,
      fileName,
      wordCount,
      parsedUrl.toString(),
      text,
      `Extraído automáticamente de la página web: ${parsedUrl.toString()}`,
      productId || null,
    ]);

    return NextResponse.json({
      success: true,
      file: rows[0],
      wordCount,
      title,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[Knowledge Scrape URL Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
