'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, ArrowUp } from 'lucide-react';
import { useTheme } from '@/design-system/useTheme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  properties?: PropertyResult[];
  showCapture?: boolean;
}

interface PropertyResult {
  id: string;
  title: string;
  operation: string;
  property_type: string;
  city: string;
  neighborhood?: string;
  price: number;
  currency: string;
  bedrooms?: number;
  bathrooms?: number;
  construction_sqm?: number;
  gallery_images?: string[];
}

function PropertyCard({ p }: { p: PropertyResult }) {
  return (
    <a
      href={`/propiedad/${p.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl border border-line bg-soft/60 p-3 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-light">
        {p.gallery_images?.[0] ? (
          <img src={p.gallery_images[0]} alt={p.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xl">🏠</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{p.title}</p>
        <p className="text-[11px] text-ink-soft">{p.city}{p.neighborhood ? `, ${p.neighborhood}` : ''}</p>
        <p className="mt-1 text-sm font-bold text-primary">${p.price?.toLocaleString('es-MX')} {p.currency}</p>
        <div className="flex gap-2 text-[10px] text-ink-soft">
          {p.bedrooms && <span>🛏 {p.bedrooms}</span>}
          {p.bathrooms && <span>🚿 {p.bathrooms}</span>}
          {p.construction_sqm && <span>📏 {p.construction_sqm}m²</span>}
        </div>
      </div>
    </a>
  );
}

function LeadCapture({ onSubmit }: { onSubmit: (name: string, phone: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="mt-2 rounded-xl border border-line bg-soft/40 p-4">
      <p className="mb-3 text-sm text-ink-soft">¿Quieres que un asesor te contacte?</p>
      <div className="flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre"
          className="rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-primary/50" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp o teléfono"
          className="rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-primary/50" />
        <button onClick={() => { if (name && phone) onSubmit(name, phone); }}
          className="rounded-lg bg-primary py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors">
          Sí, contáctenme
        </button>
      </div>
    </div>
  );
}

export function AgentChat() {
  const { account_id } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-focus al montar
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: userText };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account_id,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message?.trim() || 'Un momento, intenta de nuevo.',
          properties: data.properties?.length > 0 ? data.properties : undefined,
          showCapture: data.captureLead,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `No pude conectarme. ${e instanceof Error ? e.message : 'Intenta de nuevo.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLead = async (name: string, phone: string) => {
    const context = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' | ');
    try {
      await fetch('/api/leads/from-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account_id, name, phone, context }),
      });
    } catch { /* silencioso */ }
    setLeadSent(true);
    setMessages((prev) => [...prev, {
      role: 'assistant',
      content: `Perfecto, ${name}. Un asesor te contactará pronto al número ${phone}. 🙌`,
    }]);
  };

  return (
    <div className="flex h-full flex-col bg-app rounded-2xl overflow-hidden">

      {/* ── Estado vacío: centrado como ChatGPT ── */}
      {!hasMessages && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-4 text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">✦</span>
          </div>
          <p className="text-base font-semibold text-ink">¿Qué propiedad estás buscando?</p>
          <p className="mt-1 text-sm text-ink-soft">Describe con tus propias palabras — zona, presupuesto, para vivir o invertir.</p>
        </div>
      )}

      {/* ── Conversación ── */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === 'user' ? (
                /* Mensaje del usuario: burbuja sutil a la derecha */
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-soft px-4 py-2.5 text-sm text-ink">
                    {m.content}
                  </div>
                </div>
              ) : (
                /* Respuesta IA: texto limpio a todo ancho, sin burbuja */
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">{m.content}</p>
                  {m.properties && m.properties.length > 0 && (
                    <div className="space-y-2">
                      {m.properties.slice(0, 3).map((p) => (
                        <PropertyCard key={p.id} p={p} />
                      ))}
                      {m.properties.length > 3 && (
                        <a href="/propiedades" className="block text-center text-xs font-semibold text-primary hover:underline pt-1">
                          Ver {m.properties.length - 3} propiedades más →
                        </a>
                      )}
                    </div>
                  )}
                  {m.showCapture && !leadSent && (
                    <LeadCapture onSubmit={handleLead} />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Indicador de "escribiendo" */}
          {loading && (
            <div className="flex items-center gap-1.5 py-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:300ms]" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Input — siempre abajo ── */}
      <div className={`px-4 pb-4 ${!hasMessages ? 'pt-0' : 'pt-2 border-t border-line'}`}>
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-soft px-4 py-2.5 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escribe lo que buscas..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-inverse transition-all hover:bg-primary-light disabled:opacity-30"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <ArrowUp size={14} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
