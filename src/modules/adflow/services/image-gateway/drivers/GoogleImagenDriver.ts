import { IImageProvider, GenerateImageParams, GenerateImageResponse } from '../types';

export class GoogleImagenDriver implements IImageProvider {
  readonly id = 'google_imagen';
  readonly name = 'Google Imagen 3';
  readonly description = 'Modelo visual de Google con renderizado fotográfico hiperrealista.';

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    const apiKey = params.apiKey?.trim() || process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurado para Google Imagen.');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: params.prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: params.aspectRatio,
            outputMimeType: 'image/jpeg',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error de Google Imagen (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      throw new Error('Google Imagen no devolvió la imagen generada.');
    }

    return {
      url: `data:image/jpeg;base64,${base64Image}`,
      provider: 'google_imagen',
      modelUsed: 'imagen-3.0-generate-002',
      aspectRatio: params.aspectRatio,
      costEstimateUsd: 0.03,
    };
  }
}
