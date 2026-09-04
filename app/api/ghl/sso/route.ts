import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('location_id') || searchParams.get('locationId') || searchParams.get('location');

  if (!locationId) {
    return NextResponse.json({ error: 'Falta el parámetro location_id en la URL' }, { status: 400 });
  }

  // Guardamos el location_id en una cookie para que el frontend (useAuth) sepa quién es
  const cookieStore = await cookies();
  cookieStore.set('ghl_location_id', locationId, { 
    path: '/', 
    maxAge: 60 * 60 * 24 * 7, // 1 semana
    secure: true, 
    sameSite: 'none' // Crucial para iframes de GoHighLevel
  });

  // Redirigir al panel de settings de whatsapp (o al admin normal)
  return NextResponse.redirect(new URL('/admin/settings', req.url));
}
