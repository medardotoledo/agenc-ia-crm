export type AdAspectRatio = '1:1' | '9:16' | '16:9';

export interface GenerateImageParams {
  prompt: string;
  aspectRatio: AdAspectRatio;
  modelId?: string;
  accountId?: string;
  apiKey?: string;
  apiUrl?: string;
  customOptions?: Record<string, any>;
}

export interface GenerateImageResponse {
  url: string;
  provider: string;
  modelUsed: string;
  aspectRatio: AdAspectRatio;
  costEstimateUsd?: number;
}

export interface IImageProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  generateImage(params: GenerateImageParams): Promise<GenerateImageResponse>;
}
