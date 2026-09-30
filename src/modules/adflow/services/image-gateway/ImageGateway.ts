import { IImageProvider, GenerateImageParams, GenerateImageResponse } from './types';
import { SandboxDriver } from './drivers/SandboxDriver';
import { NanobananaDriver } from './drivers/NanobananaDriver';
import { FalAiDriver } from './drivers/FalAiDriver';
import { GoogleImagenDriver } from './drivers/GoogleImagenDriver';
import { OpenAiDriver } from './drivers/OpenAiDriver';
import { CustomEndpointDriver } from './drivers/CustomEndpointDriver';

export class ImageGateway {
  private static instance: ImageGateway;
  private providers: Map<string, IImageProvider> = new Map();

  private constructor() {
    this.registerProvider(new SandboxDriver());
    this.registerProvider(new NanobananaDriver());
    this.registerProvider(new FalAiDriver());
    this.registerProvider(new GoogleImagenDriver());
    this.registerProvider(new OpenAiDriver());
    this.registerProvider(new CustomEndpointDriver());
  }

  public static getInstance(): ImageGateway {
    if (!ImageGateway.instance) {
      ImageGateway.instance = new ImageGateway();
    }
    return ImageGateway.instance;
  }

  public registerProvider(provider: IImageProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): IImageProvider | undefined {
    return this.providers.get(id);
  }

  public listProviders(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
    }));
  }

  /**
   * Genera una imagen utilizando el motor preferido.
   * Si falla y está configurado un fallback, intenta con el respaldo antes de lanzar error.
   */
  public async generate(
    preferredProviderId: string,
    params: GenerateImageParams,
    fallbackProviderId: string = 'sandbox'
  ): Promise<GenerateImageResponse> {
    const provider = this.getProvider(preferredProviderId) || this.getProvider('sandbox')!;

    try {
      return await provider.generateImage(params);
    } catch (primaryErr: any) {
      console.warn(`[ImageGateway] Falló el proveedor ${preferredProviderId}: ${primaryErr.message}. Intentando fallback a ${fallbackProviderId}...`);
      
      const fallback = this.getProvider(fallbackProviderId);
      if (fallback && fallbackProviderId !== preferredProviderId) {
        return await fallback.generateImage(params);
      }
      throw primaryErr;
    }
  }
}
