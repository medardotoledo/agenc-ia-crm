import { IImageProvider, GenerateImageParams, GenerateImageResponse } from '../types';

export class NanobananaDriver implements IImageProvider {
  readonly id = 'nanobanana';
  readonly name = 'Nanobanana & Seedream AI';
  readonly description = 'Modelos de alta velocidad y bajo costo: Nanobanana ($0.039), Seedream V4 ($0.03) y Flux Kontext Pro.';

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    const apiKey = params.apiKey?.trim() || process.env.NANOBANANA_API_KEY || '';
    const apiUrl = params.apiUrl?.trim() || process.env.NANOBANANA_API_URL || 'https://api.nanobanana.com/v2/generate';
    const model = params.modelId || 'nanobanana';

    if (!apiKey) {
      throw new Error('API Key no configurada para Nanobanana / Seedream.');
    }

    const formatCode = params.aspectRatio === '9:16' ? '9_16' : params.aspectRatio === '16:9' ? '16_9' : '1_1';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        format: formatCode,
        model: model,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error de Nanobanana (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const imageUrl = data.url || data.imageUrl || data.image;

    if (!imageUrl) {
      throw new Error('El endpoint de Nanobanana no devolvió una URL de imagen válida.');
    }

    return {
      url: imageUrl,
      provider: 'nanobanana',
      modelUsed: model,
      aspectRatio: params.aspectRatio,
      costEstimateUsd: model === 'seedream_v4' ? 0.03 : 0.0398,
    };
  }
}
