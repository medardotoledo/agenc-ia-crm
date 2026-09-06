'use client';

import { useState, useEffect } from 'react';
import { Save, Check, Key, Eye, EyeOff, ExternalLink, Sparkles, Brain, Bot } from 'lucide-react';

interface AiKeysSettingsProps {
  accountId: string;
}

export function AiKeysSettings({ accountId }: AiKeysSettingsProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');

  const [showGemini, setShowGemini] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/settings/ai-keys?account_id=' + (accountId || 'default'))
      .then((res) => res.json())
      .then((data) => {
        if (data.gemini_key) setGeminiKey(data.gemini_key);
        if (data.anthropic_key) setAnthropicKey(data.anthropic_key);
        if (data.openai_key) setOpenaiKey(data.openai_key);
      })
      .catch((err) => console.error('Error al cargar llaves de IA:', err))
      .finally(() => setLoading(false));
  }, [accountId]);

  const handleSave = async (provider: 'gemini' | 'anthropic' | 'openai') => {
    setSavingKey(provider);
    setMsg(null);
    try {
      const payload: any = { account_id: accountId || 'default' };
      if (provider === 'gemini') payload.gemini_key = geminiKey.trim();
      if (provider === 'anthropic') payload.anthropic_key = anthropicKey.trim();
      if (provider === 'openai') payload.openai_key = openaiKey.trim();

      const res = await fetch('/api/settings/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al guardar la llave');
      setSavedKey(provider);
      setTimeout(() => setSavedKey(null), 3000);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Google Gemini Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Google Gemini
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Recomendado para Fábrica
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Alimenta a tus Setters y Closers con Gemini 2.0 Flash y Gemini 1.5 Pro.
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0"
          >
            <span>Obtener Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                disabled={loading || savingKey === 'gemini'}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleSave('gemini')}
            disabled={loading || savingKey === 'gemini'}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {savedKey === 'gemini' ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Llave de Gemini Guardada</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{savingKey === 'gemini' ? 'Guardando...' : 'Guardar Llave de Gemini'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Claude (Anthropic) Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Claude (Anthropic)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Persuasión FBI
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Claude 3.5 Sonnet para máxima empatía y calidez humana en ventas.
              </p>
            </div>
          </div>

          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 shrink-0"
          >
            <span>Obtener Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showAnthropic ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                disabled={loading || savingKey === 'anthropic'}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-purple-600 focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAnthropic(!showAnthropic)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showAnthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleSave('anthropic')}
            disabled={loading || savingKey === 'anthropic'}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {savedKey === 'anthropic' ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Llave de Claude Guardada</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{savingKey === 'anthropic' ? 'Guardando...' : 'Guardar Llave de Claude'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. OpenAI Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                OpenAI (GPT-4o)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  Multimodal
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                GPT-4o y GPT-4o Mini para respuestas técnicas estructuradas.
              </p>
            </div>
          </div>

          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1 shrink-0"
          >
            <span>Obtener Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showOpenai ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                disabled={loading || savingKey === 'openai'}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-orange-600 focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleSave('openai')}
            disabled={loading || savingKey === 'openai'}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {savedKey === 'openai' ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Llave de OpenAI Guardada</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{savingKey === 'openai' ? 'Guardando...' : 'Guardar Llave de OpenAI'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
