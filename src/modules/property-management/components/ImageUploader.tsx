'use client';

// ════════════════════════════════════════════════════════════════
// ImageUploader — sube imágenes a Storage y administra el arreglo de URLs
// ════════════════════════════════════════════════════════════════
// La PRIMERA imagen del arreglo se considera la PORTADA.

import { useRef, useState } from 'react';
import { uploadImages } from '@/lib/storage/imageUpload';

interface ImageUploaderProps {
  accountId: string;
  label: string;
  hint?: string;
  values: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ accountId, label, hint, values, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const urls = await uploadImages(Array.from(files), accountId);
      onChange([...values, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imágenes');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => {
    if (i === 0) return;
    const copy = [...values];
    const [item] = copy.splice(i, 1);
    copy.unshift(item);
    onChange(copy);
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {hint && <span className="mb-2 block text-xs text-ink-soft">{hint}</span>}

      {/* Zona de arrastre */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? 'border-primary-light bg-primary-light/5' : 'border-line bg-soft hover:border-primary-light/60'
        }`}
      >
        <span className="text-sm font-semibold text-ink">
          {uploading ? 'Subiendo…' : 'Arrastra imágenes aquí o haz clic para elegir'}
        </span>
        <span className="text-xs text-ink-soft">JPG, PNG, WebP o GIF · máx. 10 MB c/u</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {/* Miniaturas */}
      {values.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {values.map((url, i) => (
            <div key={url + i} className="group relative overflow-hidden rounded-lg border border-line bg-app">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Imagen ${i + 1}`} className="h-28 w-full object-cover" />

              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-inverse">
                  Portada
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-dark/60 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <button type="button" onClick={() => makeCover(i)} className="text-[11px] font-semibold text-inverse hover:underline">
                    Portada
                  </button>
                )}
                <button type="button" onClick={() => remove(i)} className="ml-auto text-[11px] font-semibold text-inverse hover:underline">
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
