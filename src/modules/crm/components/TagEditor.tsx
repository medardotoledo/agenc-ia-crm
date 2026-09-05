'use client';

/**
 * Editor de etiquetas de un lead: muestra chips, permite agregar del catálogo
 * o CREAR etiquetas nuevas (ilimitadas), y quitarlas. Persiste vía tagsService
 * (que además emite eventos = base para automatizaciones/IA).
 */

import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useActiveAccount } from '@/core/account/activeAccount';
import { useLeads } from '@/store/useApp';
import { tagsService, type Tag } from '@/modules/crm/services/tagsService';
import type { Lead } from '@/types';

export function TagEditor({ lead }: { lead: Lead }) {
  const { account } = useActiveAccount();
  const { setLeadTags } = useLeads();
  const [catalog, setCatalog] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const current = lead.tags ?? [];

  useEffect(() => {
    if (account) {
      fetch(`/api/ghl/tags?locationId=${account.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.tags && Array.isArray(data.tags)) {
            setCatalog(data.tags.map((t: any) => ({ id: t.id, name: t.name, color: t.color || '#E2E8F0' })));
          }
        })
        .catch(() => {});
    }
  }, [account?.id]);

  if (!account || !lead.contactId) return null;

  const add = async (tag: Tag) => {
    if (current.some((t) => t.id === tag.id || t.name === tag.name)) return;
    setLeadTags(lead.id, [...current, tag]);
    setOpen(false);
    try {
      await fetch('/api/ghl/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: account.id,
          contactId: lead.contactId,
          tags: [tag.name],
        }),
      });
    } catch (e) {
      console.warn('addTag to GHL:', (e as Error).message);
    }
  };

  const remove = async (tag: Tag) => {
    setLeadTags(lead.id, current.filter((t) => t.id !== tag.id && t.name !== tag.name));
    try {
      await fetch('/api/ghl/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: account.id,
          contactId: lead.contactId,
          tags: [tag.name],
        }),
      });
    } catch (e) {
      console.warn('removeTag from GHL:', (e as Error).message);
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const tag: Tag = { id: 'tag_' + Date.now(), name, color: '#E2E8F0' };
    setCatalog((c) => [...c, tag]);
    setNewName('');
    await add(tag);
  };

  const available = catalog.filter((t) => !current.some((c) => c.id === t.id));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {current.map((t) => (
          <span
            key={t.id}
            style={{ background: t.color }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-ink"
          >
            {t.name}
            <button onClick={() => remove(t)} className="opacity-60 hover:opacity-100" aria-label={`Quitar ${t.name}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-ink-soft hover:border-primary-light hover:text-primary-light"
        >
          <Plus size={11} /> etiqueta
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-lg border border-line bg-app p-2 shadow-sm">
          <div className="mb-2 flex gap-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
              placeholder="Nueva etiqueta…"
              className="flex-1 rounded border border-line px-2 py-1 text-xs outline-none"
            />
            <button onClick={createAndAdd} className="rounded bg-primary px-2 py-1 text-xs font-semibold text-inverse">
              Crear
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {available.length === 0 && <span className="text-xs text-ink-soft">Crea una etiqueta arriba ↑</span>}
            {available.map((t) => (
              <button
                key={t.id}
                onClick={() => add(t)}
                style={{ background: t.color }}
                className="rounded-full px-2 py-0.5 text-xs font-semibold text-ink hover:opacity-80"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
