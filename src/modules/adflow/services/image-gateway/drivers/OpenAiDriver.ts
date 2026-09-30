import { IImageProvider, GenerateImageParams, GenerateImageResponse } from '../types';

export class OpenAiDriver implements IImageProvider {
  readonly id = 'openai_dalle';
  readonly name = 'OpenAI DALL-E 3';
  readonly description = 'Modelo clásico de OpenAI para imágenes publicitarias.';

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    const apiKey = params.apiKey?.trim() || process.env.OPENAI_API_KEY || '';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurado para DALL-E 3.');
    }

    const dalleSize =
      params.aspectRatio === '9:16' ? '1024x1792' : params.aspectRatio === '16:9' ? '1792x1024' : '1024x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: params.prompt,
        n: 1,
        size: dalleSize,
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Error de DALL-E (${response.statusText})`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No se recibió URL de imagen desde OpenAI.');
    }

    return {
      url: imageUrl,
      provider: 'openai_dalle',
      modelUsed: 'dall-e-3',
      aspectRatio: params.aspectRatio,
      costEstimateUsd: 0.04,
    };
  }
}
