import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Check, Sparkles, RefreshCw } from 'lucide-react';

interface TemplateItem {
  id: string;
  name: string;
  type: string;
  body: string;
  attachments?: any[];
  dateAdded?: string;
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (text: string) => void;
  locationId?: string;
  contactData?: {
    name?: string;
    firstName?: string;
    phone?: string;
    email?: string;
  };
}

export function TemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
  locationId = 'OS9czz85LUvBeljk8FEv',
  contactData = {},
}: TemplatesModalProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, locationId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ghl/templates?locationId=${locationId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Extraer primer nombre del contacto para reemplazos
  const fullName = contactData.name || '';
  const firstName = contactData.firstName || fullName.split(' ')[0] || 'Hola';

  const replaceVariables = (text: string) => {
    return text
      .replace(/{{\s*contact\.first_name\s*}}/gi, firstName)
      .replace(/{{\s*contact\.name\s*}}/gi, fullName || firstName)
      .replace(/{{\s*contact\.phone\s*}}/gi, contactData.phone || '')
      .replace(/{{\s*contact\.email\s*}}/gi, contactData.email || '');
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-app shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Plantillas y Respuestas Rápidas</h3>
              <p className="text-xs text-ink-soft">
                Conectado a GoHighLevel • {templates.length} plantillas disponibles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-soft hover:text-ink transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buscador */}
        <div className="border-b border-line px-5 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Buscar plantilla por título o contenido…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-soft/50 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Lista de plantillas */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-1/2 border-r border-line overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-ink-soft">
                <RefreshCw size={20} className="animate-spin mb-2 text-primary" />
                <span className="text-xs">Cargando plantillas de GoHighLevel...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-soft">
                No se encontraron plantillas.
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full rounded-xl p-3 text-left transition border ${
                    selectedId === t.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-soft'
                  }`}
                >
                  <p className="text-xs font-bold text-ink truncate">{t.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-ink-soft leading-snug">
                    {t.body || '(Sin texto predefinido)'}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Vista previa y personalización */}
          <div className="flex flex-1 flex-col p-4 overflow-y-auto">
            {selectedTemplate ? (
              <div className="flex h-full flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">
                      Vista previa personalizada
                    </span>
                    <span className="rounded bg-wa-bg px-2 py-0.5 text-[10px] font-bold text-wa-text">
                      {selectedTemplate.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-line bg-soft/40 p-3.5 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    {replaceVariables(selectedTemplate.body)}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                    <Sparkles size={13} />
                    <span>Variables como <strong>{`{{contact.first_name}}`}</strong> reemplazadas con {firstName}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex gap-2 justify-end">
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-soft"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onSelectTemplate(replaceVariables(selectedTemplate.body));
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-inverse hover:bg-primary-light transition shadow-sm"
                  >
                    <Check size={14} />
                    <span>Insertar en chat</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-ink-soft text-center p-6">
                <FileText size={32} className="mb-2 opacity-40 text-primary" />
                <p className="text-xs font-semibold">Selecciona una plantilla de la izquierda para previsualizarla</p>
                <p className="text-[11px] mt-1 text-ink-soft">
                  El nombre del lead se completará automáticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
