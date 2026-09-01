export type AIProvider = 'claude' | 'openai' | 'default';

export interface AIGenerationRequest {
  type: 'landing' | 'blog' | 'text' | 'pdf';
  propertyId?: string;
  context?: Record<string, any>;
  customPrompt?: string;
  provider?: AIProvider;
}

export interface AIGenerationResponse {
  success: boolean;
  content?: string | Record<string, any>;
  error?: string;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
  };
}

export interface UserAIConfig {
  provider: AIProvider;
  claudeApiKey?: string;
  openaiApiKey?: string;
}

export const AI_PROVIDERS = {
  CLAUDE: 'claude',
  OPENAI: 'openai',
  DEFAULT: 'default',
} as const;

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI',
  default: 'Default (API Built-in)',
};
