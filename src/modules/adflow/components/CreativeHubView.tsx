'use client';

import { useState } from 'react';
import { 
  Sparkles, Download, ArrowRight, Loader2, 
  Layers, Check, Copy, Wand2, Image as ImageIcon 
} from 'lucide-react';
import type { AdAspectRatio } from '../services/image-gateway/types';

interface GeneratedImageItem {
  id: string;
  url: string;
  provider: string;
  model: string;
  ratio: AdAspectRatio;
  prompt: string;
  createdAt: string;
}

export default function CreativeHubView() {
  const [prompt, setPrompt] = useState('Fotografía publicitaria de residencia moderna con alberca y acabados de lujo, atardecer cálido, estilo arquitectónico contemporáneo, 8k');
  const [provider, setProvider] = useState('nanobanana');
  const [modelId, setModelId] = useState('nanobanana');
  const [aspectRatio, setAspectRatio] = useState<AdAspectRatio>('1:1');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<GeneratedImageItem[]>([
    {
      id: 'img-1',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&fit=crop',
      provider: 'nanobanana',
      model: 'seedream_v4',
      ratio: '1:1',
      prompt: 'Residencia en preventa arquitectura contemporánea',
      createdAt: 'Hace 10 min',
    },
    {
      id: 'img-2',
      url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1080&fit=crop',
      provider: 'fal_ai',
      model: 'flux-schnell',
      ratio: '9:16',
      prompt: 'Stories TikTok departamento moderno con terraza',
      createdAt: 'Hace 1 hora',
    },
  ]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/adflow/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          provider: provider === 'nanobanana' ? 'nanobanana' : provider,
          modelId,
        }),
      });

      const data = await res.json();
      if (data.url) {
        setHistory((prev) => [
          {
            id: String(Date.now()),
            url: data.url,
            provider: data.provider || provider,
            model: data.modelUsed || modelId,
            ratio: aspectRatio,
            prompt,
            createdAt: 'Justo ahora',
          },
          ...prev,
        ]);
      }
    } catch (e) {
      console.error(e);
      alert('Error generando imagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          🎨 Creative Hub · Gateway Multi-Modelo
        </h2>
        <p className="text-xs text-ink-soft">
          Genera creativos publicitarios en cualquier formato utilizando los mejores motores de IA del mercado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL DE GENERACIÓN (5 cols) */}
        <div className="lg:col-span-5 bg-card border border-line rounded-3xl p-6 shadow-sm space-y-4">
          {/* Selector de Motor */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
              Motor de Imagen de IA
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                if (e.target.value === 'nanobanana') setModelId('nanobanana');
                if (e.target.value === 'fal_ai') setModelId('fal-ai/flux/schnell');
                if (e.target.value === 'google_imagen') setModelId('imagen-3');
              }}
              className="w-full text-xs font-bold rounded-xl border border-line bg-app p-2.5 text-ink focus:outline-none focus:border-primary"
            >
              <option value="nanobanana">🍌 Nanobanana ($0.0398 / img)</option>
              <option value="seedream">🎵 Seedream V4 · ByteDance ($0.03 / img)</option>
              <option value="fal_ai">⚡ Fal.ai (Flux.1 Schnell · $0.0035 / img)</option>
              <option value="google_imagen">🔵 Google Imagen 3 ($0.03 / img)</option>
              <option value="openai_dalle">🟢 OpenAI DALL-E 3 ($0.04 / img)</option>
              <option value="sandbox">🧪 Modo Demo (Sandbox Gratuito $0)</option>
            </select>
          </div>

          {/* Selector de Formato / Aspect Ratio */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
              Formato / Proporción
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1:1', label: '1:1 Cuadrado', sub: 'Meta Feed' },
                { id: '9:16', label: '9:16 Vertical', sub: 'Stories / TikTok' },
                { id: '16:9', label: '16:9 Horizontal', sub: 'Google Display' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setAspectRatio(fmt.id as AdAspectRatio)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    aspectRatio === fmt.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-line hover:border-primary/20 text-ink'
                  }`}
                >
                  <span className="text-xs block font-bold">{fmt.label}</span>
                  <span className="text-[9px] text-ink-soft block">{fmt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Prompt Publicitario
              </label>
              <button
                type="button"
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                onClick={() => setPrompt(prompt + ', iluminación cinematográfica dorada, composición publicitaria de alta gama')}
              >
                <Wand2 size={10} /> Pulir prompt
              </button>
            </div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full text-xs rounded-xl border border-line bg-app p-3 text-ink focus:outline-none focus:border-primary leading-relaxed"
              placeholder="Describe la escena, producto o ambientación deseada..."
            />
          </div>

          {/* Botón Generar */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Renderizando con IA...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generar Creativo
              </>
            )}
          </button>
        </div>

        {/* GALERÍA DE CREATIVOS GENERADOS (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Creativos Recientes ({history.length})
            </h3>
            <span className="text-[10px] text-ink-soft">Almacenados en tu VPS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-line bg-card overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-square bg-zinc-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    {item.ratio} · {item.provider}
                  </span>
                </div>

                <div className="p-3.5 space-y-2 text-left">
                  <p className="text-[11px] text-ink line-clamp-2 leading-snug">
                    {item.prompt}
                  </p>
                  <div className="pt-2 border-t border-line flex items-center justify-between text-[10px] text-ink-soft">
                    <span>{item.createdAt}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Download size={10} /> Descargar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
