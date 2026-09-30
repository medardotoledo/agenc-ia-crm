import { IImageProvider, GenerateImageParams, GenerateImageResponse } from '../types';

export class CustomEndpointDriver implements IImageProvider {
  readonly id = 'custom_endpoint';
  readonly name = 'Endpoint Personalizado (OpenAI / REST)';
  readonly description = 'Conecta cualquier URL o proxy de IA serverless ingresando Base URL y API Key.';

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    const apiKey = params.apiKey?.trim() || '';
    const apiUrl = params.apiUrl?.trim() || '';
    const model = params.modelId || 'default';

    if (!apiUrl) {
      throw new Error('Debes especificar la URL del Endpoint Personalizado.');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio,
        model: model,
        options: params.customOptions || {},
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error del endpoint personalizado (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const imageUrl = data.url || data.imageUrl || data.image || data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('El endpoint personalizado no devolvió una URL válida de imagen.');
    }

    return {
      url: imageUrl,
      provider: 'custom_endpoint',
      modelUsed: model,
      aspectRatio: params.aspectRatio,
      costEstimateUsd: 0.02,
    };
  }
}
