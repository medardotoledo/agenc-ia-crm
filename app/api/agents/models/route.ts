import { NextResponse } from 'next/server';

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'google' | 'anthropic' | 'openai';
  status: 'active' | 'deprecated' | 'legacy';
  description: string;
  isRecommended?: boolean;
  recommendedReplacement?: string;
}

export const CATALOG: Record<'google' | 'anthropic' | 'openai', ModelInfo[]> = {
  google: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash (Recomendado)',
      provider: 'google',
      status: 'active',
      isRecommended: true,
      description: 'Ultra rápido, multimodal y excelente para interacción dinámica de ventas por WhatsApp.',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      status: 'active',
      description: 'Ventana de contexto masiva de 2M tokens y razonamiento técnico exhaustivo.',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      status: 'active',
      description: 'Ligero y sumamente económico para respuestas de soporte inmediatas.',
    },
    // Modelos deprecados para detección preventiva
    {
      id: 'gemini-1.0-pro',
      name: 'Gemini 1.0 Pro (Deprecado)',
      provider: 'google',
      status: 'deprecated',
      recommendedReplacement: 'gemini-2.0-flash',
      description: 'Modelo discontinuado por Google. Se sugiere actualizar a Gemini 2.0 Flash.',
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro Legacy (Deprecado)',
      provider: 'google',
      status: 'deprecated',
      recommendedReplacement: 'gemini-2.0-flash',
      description: 'Versión antigua deshabilitada. Actualizar a Gemini 2.0 Flash.',
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet (Recomendado Ventas)',
      provider: 'anthropic',
      status: 'active',
      isRecommended: true,
      description: 'Líder en calidez humana, empatía, persuasión psicológica y técnicas de Chris Voss.',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      status: 'active',
      description: 'Velocidad relámpago con alta precisión sintáctica para atención al cliente.',
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      status: 'active',
      description: 'Máxima potencia para análisis cognitivo de manuales densos de ingeniería.',
    },
    // Deprecados
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet (Antiguo)',
      provider: 'anthropic',
      status: 'legacy',
      recommendedReplacement: 'claude-3-5-sonnet-20241022',
      description: 'Superado por Claude 3.5 Sonnet. Se recomienda actualizar.',
    },
    {
      id: 'claude-2.1',
      name: 'Claude 2.1 (Deprecado)',
      provider: 'anthropic',
      status: 'deprecated',
      recommendedReplacement: 'claude-3-5-sonnet-20241022',
      description: 'Versión descontinuada por Anthropic. Actualizar a Claude 3.5 Sonnet.',
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o Omni (Recomendado)',
      provider: 'openai',
      status: 'active',
      isRecommended: true,
      description: 'Rápido, versátil y excelente seguimiento de formatos y reglas estrictas.',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      status: 'active',
      description: 'Ultrarrápido y sumamente accesible para altos volúmenes de conversación.',
    },
    {
      id: 'o3-mini',
      name: 'o3-mini (Razonamiento)',
      provider: 'openai',
      status: 'active',
      description: 'Especializado en resolución de problemas lógicos y diagnósticos paso a paso.',
    },
    // Deprecados
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo (Legacy)',
      provider: 'openai',
      status: 'legacy',
      recommendedReplacement: 'gpt-4o-mini',
      description: 'Modelo antiguo con menor calidad de respuesta. Se sugiere GPT-4o Mini.',
    },
  ],
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') as 'google' | 'anthropic' | 'openai' | null;

    if (provider && CATALOG[provider]) {
      return NextResponse.json({
        provider,
        models: CATALOG[provider],
      });
    }

    return NextResponse.json({
      catalog: CATALOG,
      allActiveModels: [
        ...CATALOG.google.filter((m) => m.status === 'active'),
        ...CATALOG.anthropic.filter((m) => m.status === 'active'),
        ...CATALOG.openai.filter((m) => m.status === 'active'),
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
