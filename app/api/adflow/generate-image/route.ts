import { NextResponse } from 'next/server';
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

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API AdFlow Generate Image] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
