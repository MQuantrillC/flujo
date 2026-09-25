'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Paperclip, Send } from 'lucide-react';
import { ACEPTA_ADJUNTOS, MAX_MB_ADJUNTO } from '@/lib/adjuntos';
import { Miniaturas } from './Miniaturas';
import { useAdjuntos } from './useAdjuntos';

/**
 * Comentar y adjuntar archivos (imágenes, PDF, Office, CSV…). Entran de tres
 * formas: el botón, pegándolos (Ctrl+V) o arrastrándolos al cuadro. Se puede
 * mandar sólo texto, sólo archivos, o ambos.
 */
export function FormularioComentario({ tareaId }: { tareaId: string }) {
  const t = useTranslations('comentarios');
  const te = useTranslations('errores');
  const [texto, setTexto] = useState('');
  const adj = useAdjuntos();
  const [enviando, setEnviando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const enviar = async () => {
    if (enviando || (!texto.trim() && adj.archivos.length === 0)) return;
    setEnviando(true); adj.setError(null);
    const fd = new FormData();
    fd.set('texto', texto);
    adj.archivos.forEach((a) => fd.append('archivos', a, a.name));
    try {
      const r = await fetch(`/api/tareas/${tareaId}/comentarios`, { method: 'POST', body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(te(j?.error ?? 'generico', { nombre: j?.nombre ?? '', mb: MAX_MB_ADJUNTO }));
      }
      setTexto(''); adj.limpiar(); router.refresh();
    } catch (e) {
      adj.setError(e instanceof Error ? e.message : te('generico'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className={`tarjeta p-3 transition-colors ${arrastrando ? 'border-acento bg-acento/5' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); adj.agregar(e.dataTransfer.files); }}
    >
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={adj.alPegar}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void enviar(); }}
        rows={3}
        className="w-full resize-y bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        placeholder={t('placeholder')}
      />
      <div className="mt-2 empty:hidden"><Miniaturas archivos={adj.archivos} vistas={adj.vistas} onQuitar={adj.quitar} /></div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input ref={entrada} type="file" accept={ACEPTA_ADJUNTOS} multiple className="hidden" onChange={(e) => { adj.agregar(e.target.files); e.target.value = ''; }} />
        <button type="button" onClick={() => entrada.current?.click()} className="boton-suave"><Paperclip size={14} /> {t('archivo')}</button>
        <span className="text-[11px] text-gray-400">{t('tiposAyuda', { mb: MAX_MB_ADJUNTO })}</span>
        {adj.error && <span className="text-xs text-red-600">{adj.error}</span>}
        <span className="ml-auto text-[11px] text-gray-400">Ctrl+Enter</span>
        <button type="button" onClick={() => void enviar()} disabled={enviando || (!texto.trim() && adj.archivos.length === 0)} className="boton">
          <Send size={14} /> {enviando ? t('enviando') : adj.archivos.length && !texto.trim() ? t('adjuntar') : t('comentar')}
        </button>
      </div>
    </div>
  );
}
