'use client';

// Las vistas previas de lo que se va a subir: miniatura si es imagen, ficha
// con nombre y peso si no, y una X para sacarlo de la lista.

import { FileText, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { tamanoLegible } from '@/lib/adjuntos';

export function Miniaturas({ archivos, vistas, onQuitar, tam = 'md' }: { archivos: File[]; vistas: (string | null)[]; onQuitar: (i: number) => void; tam?: 'sm' | 'md' }) {
  const t = useTranslations('comentarios');
  if (archivos.length === 0) return null;
  const lado = tam === 'sm' ? 'h-14 w-14' : 'h-20 w-20';
  return (
    <div className="flex flex-wrap gap-2">
      {archivos.map((a, i) => (
        <span key={i} className="relative">
          {vistas[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vistas[i]} alt={a.name} className={`${lado} rounded-lg border border-gray-200 object-cover`} />
          ) : (
            <span className="flex max-w-56 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs">
              <FileText size={16} className="shrink-0 text-gray-500" />
              <span className="min-w-0"><span className="block truncate font-medium text-gray-800">{a.name}</span><span className="text-gray-400">{tamanoLegible(a.size)}</span></span>
            </span>
          )}
          <button type="button" onClick={() => onQuitar(i)} className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white" aria-label={t('quitar')}><X size={12} /></button>
        </span>
      ))}
    </div>
  );
}
