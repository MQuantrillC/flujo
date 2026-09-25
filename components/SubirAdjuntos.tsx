'use client';

// Adjuntar archivos directo al pendiente, desde su ficha: el botón, pegar o
// arrastrar sobre el recuadro. Sin comentario de por medio.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Paperclip, Upload } from 'lucide-react';
import { ACEPTA_ADJUNTOS, MAX_MB_ADJUNTO } from '@/lib/adjuntos';
import { Miniaturas } from './Miniaturas';
import { useAdjuntos } from './useAdjuntos';

export function SubirAdjuntos({ tareaId }: { tareaId: string }) {
  const t = useTranslations('tarea');
  const tc = useTranslations('comentarios');
  const adj = useAdjuntos();
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const subir = async () => {
    if (subiendo || adj.archivos.length === 0) return;
    setSubiendo(true);
    const error = await adj.subir(tareaId);
    setSubiendo(false);
    if (error) adj.setError(error);
    else { adj.limpiar(); router.refresh(); }
  };

  return (
    <div
      tabIndex={0}
      onPaste={adj.alPegar}
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); adj.agregar(e.dataTransfer.files); }}
      className={`flex flex-col gap-2 rounded-lg border border-dashed p-3 outline-none transition-colors focus:border-acento/60 ${arrastrando ? 'border-acento bg-acento/5' : 'border-gray-200'}`}
    >
      <Miniaturas archivos={adj.archivos} vistas={adj.vistas} onQuitar={adj.quitar} />
      <div className="flex flex-wrap items-center gap-2">
        <input ref={entrada} type="file" accept={ACEPTA_ADJUNTOS} multiple className="hidden" onChange={(e) => { adj.agregar(e.target.files); e.target.value = ''; }} />
        <button type="button" onClick={() => entrada.current?.click()} className="boton-suave"><Paperclip size={14} /> {tc('archivo')}</button>
        <span className="text-[11px] text-gray-400">{t('adjuntarAyuda', { mb: MAX_MB_ADJUNTO })}</span>
        {adj.error && <span className="text-xs text-red-600">{adj.error}</span>}
        {adj.archivos.length > 0 && (
          <button type="button" onClick={() => void subir()} disabled={subiendo} className="boton ml-auto">
            <Upload size={14} /> {subiendo ? tc('enviando') : t('subir', { n: adj.archivos.length })}
          </button>
        )}
      </div>
    </div>
  );
}
