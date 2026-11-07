/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { validateImageFile, VALIDATION_LIMITS } from '@/lib/validations';

interface PhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** Nombre de photos déjà présentes (pour respecter la limite totale). */
  existingCount?: number;
  max?: number;
}

/** Sélecteur de photos : glisser-déposer ou clic, aperçus, suppression. La première devient la couverture. */
export function PhotoPicker({ files, onChange, existingCount = 0, max = VALIDATION_LIMITS.MAX_PHOTOS }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const room = Math.max(0, max - existingCount);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const add = (list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    let problem: string | null = null;
    for (const f of incoming) {
      const check = validateImageFile(f);
      if (!check.valid) {
        problem = `${f.name} : ${check.error}`;
        continue;
      }
      accepted.push(f);
    }
    const merged = [...files, ...accepted];
    if (merged.length > room) problem = `Maximum ${max} photos par souvenir`;
    setError(problem);
    onChange(merged.slice(0, room));
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg bg-[#E3EDF2]">
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && existingCount === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Couverture</span>
              )}
              <button
                type="button"
                aria-label={`Retirer la photo ${i + 1}`}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < room && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            add(e.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-[#7A8794] transition ${
            dragging ? 'border-[#1F5F7B] bg-[#E3EDF2]' : 'border-[#B9C3CC] hover:bg-[#F4F5F7]'
          }`}
        >
          <ImagePlus className="h-7 w-7" />
          <span className="text-sm font-medium">Ajouter des photos</span>
          <span className="text-xs">
            JPG, PNG, WebP ou GIF · 5 Mo max · {files.length}/{room}
          </span>
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
