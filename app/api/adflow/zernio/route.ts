import { NextResponse } from 'next/server';

const ZERNIO_BASE_URL = 'https://zernio.com/api/v1';

function getApiKey(): string | null {
  return process.env.ZERNIO_API_KEY || null;
}

// Obtener o crear el perfil principal en Zernio
async function getOrCreateProfileId(apiKey: string): Promise<string> {
  const res = await fetch(`${ZERNIO_BASE_URL}/profiles`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error al consultar perfiles en Zernio: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const profiles = data.profiles || [];

  if (profiles.length > 0) {
    const defaultProfile = profiles.find((p: any) => p.isDefault) || profiles[0];
    return defaultProfile._id;
  }

  // Si no hay perfil creado, creamos uno para el CRM
  const createRes = await fetch(`${ZERNIO_BASE_URL}/profiles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'CRM Agéntico Workspace',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Error creando perfil en Zernio: ${createRes.status} - ${errorText}`);
  }

  const created = await createRes.json();
  return created._id;
}

// GET: Consultar estado o generar URL de autorización OAuth
export async function GET(req: Request) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        error: 'ZERNIO_API_KEY no configurada en las variables de entorno',
      });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    const profileId = await getOrCreateProfileId(apiKey);

    // 1. GENERAR URL DE OAUTH PARA CONECTAR PLATAFORMA
    if (action === 'connect') {
      const platform = searchParams.get('platform'); // 'meta' | 'google' | 'tiktok'
      const redirectUrl = searchParams.get('redirectUrl') || 'https://app.crmagentico.online/admin/adflow?tab=connect';

      let connectPath = '';
      if (platform === 'meta' || platform === 'facebook' || platform === 'instagram') {
        connectPath = `/connect/facebook/ads?profileId=${profileId}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
      } else if (platform === 'google' || platform === 'google-ads') {
        connectPath = `/connect/google-ads?profileId=${profileId}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
      } else if (platform === 'tiktok' || platform === 'tiktok-ads') {
        connectPath = `/connect/tiktok-ads?profileId=${profileId}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
      } else {
        return NextResponse.json({ error: `Plataforma "${platform}" no soportada` }, { status: 400 });
      }

      const connectRes = await fetch(`${ZERNIO_BASE_URL}${connectPath}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!connectRes.ok) {
        const errorText = await connectRes.text();
        return NextResponse.json(
          { error: `Error obteniendo URL de conexión: ${errorText}` },
          { status: connectRes.status }
        );
      }

      const connectData = await connectRes.json();
      return NextResponse.json({
        authUrl: connectData.authUrl,
        platform,
        profileId,
      });
    }

    // 2. CONSULTAR ESTADO DE CUENTAS VINCULADAS
    const accountsRes = await fetch(`${ZERNIO_BASE_URL}/accounts?profileId=${profileId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!accountsRes.ok) {
      const errorText = await accountsRes.text();
      return NextResponse.json(
        { error: `Error consultando cuentas en Zernio: ${errorText}` },
        { status: accountsRes.status }
      );
    }

    const accountsData = await accountsRes.json();
    const accounts = accountsData.accounts || [];

    // Clasificar cuentas vinculadas
    const metaAccount = accounts.find((a: any) =>
      ['facebook', 'instagram', 'meta'].includes((a.platform || '').toLowerCase())
    );
    const googleAccount = accounts.find((a: any) =>
      ['google', 'google-ads', 'googleads'].includes((a.platform || '').toLowerCase())
    );
    const tiktokAccount = accounts.find((a: any) =>
      ['tiktok', 'tiktok-ads', 'tiktokads'].includes((a.platform || '').toLowerCase())
    );

    return NextResponse.json({
      configured: true,
      apiKeyMasked: `${apiKey.slice(0, 7)}...${apiKey.slice(-6)}`,
      profileId,
      hasAnalyticsAccess: accountsData.hasAnalyticsAccess ?? true,
      accounts,
      status: {
        meta: {
          connected: Boolean(metaAccount),
          account: metaAccount || null,
        },
        google: {
          connected: Boolean(googleAccount),
          account: googleAccount || null,
        },
        tiktok: {
          connected: Boolean(tiktokAccount),
          account: tiktokAccount || null,
        },
      },
    });
  } catch (err: any) {
    console.error('[API AdFlow Zernio GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Desconectar una cuenta vinculada en Zernio
export async function DELETE(req: Request) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'ZERNIO_API_KEY no configurada' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId requerido' }, { status: 400 });
    }

    const res = await fetch(`${ZERNIO_BASE_URL}/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Error desconectando cuenta en Zernio: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[API AdFlow Zernio DELETE] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Publicar campaña publicitaria unificada a través de Zernio
export async function POST(req: Request) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'ZERNIO_API_KEY no configurada' }, { status: 400 });
    }

    const body = await req.json();

    // Payload de publicación autónoma hacia Zernio Ads API
    const res = await fetch(`${ZERNIO_BASE_URL}/ads/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Error publicando en Zernio Ads: ${errorText}` },
        { status: res.status }
      );
    }

    const adResult = await res.json();
    return NextResponse.json({ success: true, ad: adResult });
  } catch (err: any) {
    console.error('[API AdFlow Zernio POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
