import React, { useState, useEffect } from 'react';
import { X, Search, Film, Image as ImageIcon, FileText, Send, RefreshCw, Folder } from 'lucide-react';

interface MediaFile {
  id: string;
  name: string;
  url: string;
  contentType: string;
  fileType: 'video' | 'image' | 'document' | 'audio' | 'other';
  size: number;
  createdAt?: string;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (media: { url: string; fileType: string; name: string; caption?: string }) => Promise<void> | void;
  locationId?: string;
  leadName?: string;
}

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSendMedia,
  locationId = 'OS9czz85LUvBeljk8FEv',
  leadName = 'Lead',
}: MediaLibraryModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'video' | 'image' | 'document'>('all');
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, locationId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ghl/media?locationId=${locationId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching media files:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = files.filter((f) => {
    const matchesTab = tab === 'all' ? true : f.fileType === tab;
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    setSending(true);
    try {
      await onSendMedia({
        url: selectedFile.url,
        fileType: selectedFile.fileType,
        name: selectedFile.name,
        caption: caption.trim() || undefined,
      });
      setSelectedFile(null);
      setCaption('');
      onClose();
    } catch (err) {
      console.error('Error al enviar multimedia:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-app shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wa-bg text-wa-text">
              <Folder size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Biblioteca Multimedia de GoHighLevel</h3>
              <p className="text-xs text-ink-soft">
                {files.length} archivos disponibles para enviar a <strong className="text-ink">{leadName}</strong>
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

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-line px-6 py-3 bg-soft/30">
          <div className="flex gap-1.5 w-full sm:w-auto">
            {[
              { id: 'all', label: 'Todos', icon: Folder },
              { id: 'video', label: 'Videos MP4', icon: Film },
              { id: 'image', label: 'Imágenes', icon: ImageIcon },
              { id: 'document', label: 'Documentos PDF', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === id
                    ? 'bg-primary text-inverse shadow-sm'
                    : 'bg-app border border-line text-ink-soft hover:bg-soft'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Buscar archivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-app py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Grid de Archivos */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
                <RefreshCw size={24} className="animate-spin mb-2 text-primary" />
                <span className="text-xs">Cargando biblioteca de archivos...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-xs text-ink-soft">
                No se encontraron archivos en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filtered.map((f) => {
                  const isSelected = selectedFile?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFile(f)}
                      className={`group relative flex flex-col cursor-pointer overflow-hidden rounded-xl border p-2 transition hover:shadow-md ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-line bg-app hover:border-primary/50'
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-soft flex items-center justify-center">
                        {f.fileType === 'image' ? (
                          <img
                            src={f.url}
                            alt={f.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        ) : f.fileType === 'video' ? (
                          <div className="flex flex-col items-center justify-center text-primary">
                            <Film size={28} />
                            <span className="mt-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              VIDEO MP4
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-red-500">
                            <FileText size={28} />
                            <span className="mt-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              PDF
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink" title={f.name}>
                          {f.name}
                        </p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          {formatFileSize(f.size)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel Lateral de Envío */}
          {selectedFile && (
            <div className="w-80 border-l border-line bg-soft/30 p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-ink">Archivo Seleccionado</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-ink-soft hover:text-ink"
                  >
                    Deseleccionar
                  </button>
                </div>

                {/* Previsualizador */}
                <div className="rounded-xl border border-line bg-app p-3">
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-soft flex items-center justify-center mb-2">
                    {selectedFile.fileType === 'image' ? (
                      <img src={selectedFile.url} alt={selectedFile.name} className="h-full w-full object-contain" />
                    ) : selectedFile.fileType === 'video' ? (
                      <video src={selectedFile.url} controls className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-center p-4">
                        <FileText size={36} className="mx-auto text-red-500 mb-1" />
                        <span className="text-xs font-bold">{selectedFile.name}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-ink truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-ink-soft">{formatFileSize(selectedFile.size)}</p>
                </div>

                {/* Mensaje de acompañamiento opcional */}
                <div>
                  <label className="text-[11px] font-bold text-ink-soft mb-1 block">
                    Mensaje / Pie de foto opcional:
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Hola ${leadName}, te comparto este video/archivo...`}
                    className="w-full rounded-lg border border-line bg-app p-2.5 text-xs outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-line mt-4">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-wa-button py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enviando por WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Enviar a {leadName}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
