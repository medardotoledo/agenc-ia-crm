import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

// Usamos el pool global si ya existe para evitar mÃºltiples conexiones en desarrollo
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // Leer el location_id de la URL o de la cookie (por seguridad)
    const cookieStore = await cookies();
    let locationId = searchParams.get('locationId') || cookieStore.get('ghl_location_id')?.value;

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    // 1. Obtener el token de GHL desde nuestra base de datos PostgreSQL local
    const query = `SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;`;
    const { rows } = await pool.query(query, [locationId]);

    if (rows.length === 0 || !rows[0].access_token) {
      return NextResponse.json({ error: 'La cuenta no ha sido conectada o falta el token.' }, { status: 401 });
    }

    const accessToken = rows[0].access_token;

    // 2. Hacer la peticiÃ³n a la API de GoHighLevel
    // Referencia: https://highlevel.stoplight.io/docs/integrations/a5390616b9b3e-get-contacts
    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!ghlResponse.ok) {
      const errorData = await ghlResponse.text();
      console.error('[GHL API Error]', errorData);
      return NextResponse.json({ error: 'Error al consultar GoHighLevel API' }, { status: ghlResponse.status });
    }

    const ghlData = await ghlResponse.json();

    // 3. Formatear los contactos al esquema que espera nuestra app (Prospecto)
    const mappedContacts = (ghlData.contacts || []).map((c: any) => ({
      id: c.id,
      name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sin Nombre',
      email: c.email || null,
      phone: c.phone || null,
      message: null, // GHL Contacts API no tiene el mensaje inicial aquÃ­, requerirÃ­a Conversations API
      source: c.source || 'GoHighLevel',
      status: 'new', // Esto requerirÃ­a cruzarlo con Opportunities para tener la etapa real
      created_at: c.dateAdded,
      updated_at: c.dateUpdated,
      property_id: null,
      property_title: null,
      property_slug: null,
      tagIds: c.tags || [],
    }));

    return NextResponse.json({ prospectos: mappedContacts });
  } catch (error: any) {
    console.error('Error in /api/ghl/contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

