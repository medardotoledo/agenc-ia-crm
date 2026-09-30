import { IImageProvider, GenerateImageParams, GenerateImageResponse } from '../types';

export class FalAiDriver implements IImageProvider {
  readonly id = 'fal_ai';
  readonly name = 'Fal.ai (Flux.1)';
  readonly description = 'Modelos Flux.1 Schnell y Dev de ultra realismo y renderizado tipográfico.';

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    const apiKey = params.apiKey?.trim() || process.env.FAL_KEY || '';
    const model = params.modelId || 'fal-ai/flux/schnell';

    if (!apiKey) {
      throw new Error('FAL_KEY no configurado para Fal.ai Flux.');
    }

    const imageSizeMap = {
      '1:1': 'square_hd',
      '9:16': 'portrait_16_9',
      '16:9': 'landscape_16_9',
    };

    const response = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        image_size: imageSizeMap[params.aspectRatio] || 'square_hd',
        num_inference_steps: 4,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error de Fal.ai (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error('Fal.ai no devolvió la URL de la imagen generada.');
    }

    return {
      url: imageUrl,
      provider: 'fal_ai',
      modelUsed: model,
      aspectRatio: params.aspectRatio,
      costEstimateUsd: 0.0035,
    };
  }
}
