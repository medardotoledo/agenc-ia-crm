import { IImageProvider, GenerateImageParams, GenerateImageResponse } from '../types';

export class SandboxDriver implements IImageProvider {
  readonly id = 'sandbox';
  readonly name = 'Modo Demo (Sandbox Gratuito)';
  readonly description = 'Genera imágenes curadas de alta calidad para pruebas sin costo de API.';

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
    // Simular pequeño retardo de procesamiento de IA (500ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    const randomId = Math.floor(Math.random() * 1000);
    const isRealEstate =
      params.prompt.toLowerCase().includes('inmobil') ||
      params.prompt.toLowerCase().includes('casa') ||
      params.prompt.toLowerCase().includes('departamento') ||
      params.prompt.toLowerCase().includes('propiedad');

    const urlsByRatio: Record<string, string> = isRealEstate
      ? {
          '1:1': `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&h=1080&fit=crop&q=80&sig=${randomId}`,
          '9:16': `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1080&h=1920&fit=crop&q=80&sig=${randomId}`,
          '16:9': `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop&q=80&sig=${randomId}`,
        }
      : {
          '1:1': `https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&h=1080&fit=crop&q=80&sig=${randomId}`,
          '9:16': `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=1920&fit=crop&q=80&sig=${randomId}`,
          '16:9': `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&h=1080&fit=crop&q=80&sig=${randomId}`,
        };

    return {
      url: urlsByRatio[params.aspectRatio] || urlsByRatio['1:1'],
      provider: 'sandbox',
      modelUsed: 'mock-high-res',
      aspectRatio: params.aspectRatio,
      costEstimateUsd: 0.0,
    };
  }
}
