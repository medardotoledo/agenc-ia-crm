'use client';

// ════════════════════════════════════════════════════════════════
// ContactForm — formulario público que genera un lead
// ════════════════════════════════════════════════════════════════

import { useState, type FormEvent } from 'react';
import { leadService } from '../../services/leadService';

const inputClass =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary-light';

export default function ContactForm({
  accountId,
  propertyId,
  propertyTitle,
}: {
  accountId: string;
  propertyId: string;
  propertyTitle: string;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: `Me interesa: ${propertyTitle}` });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Por favor escribe tu nombre'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError('Déjanos un email o teléfono para contactarte'); return; }
    setError(null);
    setSending(true);
    try {
      await leadService.create(accountId, {
        property_id: propertyId,
        name: form.name.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
        message: form.message || undefined,
        source: 'contact_form',
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-6 text-center">
        <div className="text-2xl">✅</div>
        <p className="mt-2 font-semibold text-ink">¡Gracias por tu interés!</p>
        <p className="mt-1 text-sm text-ink-soft">Un asesor te contactará muy pronto.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-lg font-bold text-ink">¿Te interesa esta propiedad?</h3>
      <p className="text-sm text-ink-soft">Déjanos tus datos y te contactamos.</p>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{error}</div>}

      <input className={inputClass} placeholder="Nombre *" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <input className={inputClass} placeholder="Teléfono / WhatsApp" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      <textarea rows={3} className={inputClass} placeholder="Mensaje" value={form.message} onChange={(e) => set('message', e.target.value)} />

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-inverse transition-colors hover:bg-primary-light disabled:opacity-50"
      >
        {sending ? 'Enviando…' : 'Quiero más información'}
      </button>
    </form>
  );
}
