import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ImageGateway } from '@/modules/adflow/services/image-gateway/ImageGateway';
import type { AdAspectRatio } from '@/modules/adflow/services/image-gateway/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      aspectRatio = '1:1',
      provider = 'sandbox',
      modelId,
      apiKey,
      apiUrl,
      customOptions,
    } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'El prompt para la imagen es obligatorio' }, { status: 400 });
    }

    const gateway = ImageGateway.getInstance();

    const result = await gateway.generate(
      provider,
      {
        prompt,
        aspectRatio: (aspectRatio as AdAspectRatio) || '1:1',
        modelId,
        apiKey,
        apiUrl,
        customOptions,
      },
      'sandbox' // Fallback infalible
    );

    // PERSISTENCIA EN EL VPS:
    // Si la imagen es una URL remota de Nanobanana/Flux/Unsplash o Base64, descargarla al disco local del VPS
    if (result.url && (result.url.startsWith('http://') || result.url.startsWith('https://'))) {
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'adflow');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = result.url.includes('.png') ? '.png' : '.jpg';
        const fileName = `ad_${crypto.randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, fileName);

        const imgResponse = await fetch(result.url, { signal: AbortSignal.timeout(10000) });
        if (imgResponse.ok) {
          const buffer = await imgResponse.arrayBuffer();
          await fs.promises.writeFile(filePath, Buffer.from(buffer));
          // Reemplazar con la URL permanente local del VPS
          result.url = `/uploads/adflow/${fileName}`;
        }
      } catch (saveErr: any) {
        console.warn('[AdFlow Image Save Warning] No se pudo guardar copia local en VPS:', saveErr.message);
        // Si falla la descarga local, mantener la URL original de CDN para no interrumpir al usuario
      }
    } else if (result.url && result.url.startsWith('data:image/')) {
      // Si viene en Base64 (Google Imagen 3), guardarla a archivo
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'adflow');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const matches = result.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const fileName = `ad_${crypto.randomUUID()}.jpg`;
          const filePath = path.join(uploadDir, fileName);
          await fs.promises.writeFile(filePath, Buffer.from(matches[2], 'base64'));
          result.url = `/uploads/adflow/${fileName}`;
        }
      } catch (b64Err: any) {
        console.warn('[AdFlow Base64 Save Error]:', b64Err.message);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API AdFlow Generate Image] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
