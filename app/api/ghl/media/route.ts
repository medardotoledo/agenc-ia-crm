export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getAccessToken(locationId: string): Promise<string> {
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
      [locationId]
    );
    if (rows.length && rows[0].access_token) {
      return rows[0].access_token;
    }
  } catch (err: any) {
    console.warn('[GHL Media API] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || searchParams.get('location_id') || 'OS9czz85LUvBeljk8FEv';
    const category = searchParams.get('category'); // 'video' | 'image' | 'document' | 'audio' | 'all'

    const accessToken = await getAccessToken(locationId);
    const ghlHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    };

    const ghlUrl = `https://services.leadconnectorhq.com/medias/files?altId=${locationId}&altType=location&type=file`;
    const ghlRes = await fetch(ghlUrl, { headers: ghlHeaders });

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      console.error('[GHL Media Error]', errText);
      return NextResponse.json({ error: 'Error al consultar archivos de GHL' }, { status: ghlRes.status });
    }

    const data = await ghlRes.json();
    const rawFiles = data.files || [];

    let files = rawFiles.map((f: any) => {
      let fileType: 'video' | 'image' | 'document' | 'audio' | 'other' = 'other';
      const ct = (f.contentType || '').toLowerCase();
      if (ct.startsWith('video/') || f.name?.endsWith('.mp4') || f.name?.endsWith('.mov')) {
        fileType = 'video';
      } else if (ct.startsWith('image/') || f.name?.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
        fileType = 'image';
      } else if (ct === 'application/pdf' || f.name?.endsWith('.pdf') || f.name?.match(/\.(doc|docx|xls|xlsx)$/i)) {
        fileType = 'document';
      } else if (ct.startsWith('audio/') || f.name?.match(/\.(mp3|ogg|wav|m4a|aac|opus)$/i)) {
        fileType = 'audio';
      }

      return {
        id: f._id || f.id,
        name: f.name || 'Archivo',
        url: f.url,
        contentType: f.contentType || 'application/octet-stream',
        fileType,
        size: f.size || 0,
        createdAt: f.createdAt,
      };
    });

    if (category && category !== 'all') {
      files = files.filter((f: any) => f.fileType === category);
    }

    return NextResponse.json({
      files,
      totalCount: files.length,
    });
  } catch (error: any) {
    console.error('Error in /api/ghl/media:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
