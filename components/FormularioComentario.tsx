'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ImagePlus, Send, X } from 'lucide-react';

const MAX_MB = 10;

/**
 * Comentar y adjuntar imágenes. Las imágenes entran de tres formas: el botón,
 * pegándolas (Ctrl+V) o arrastrándolas al cuadro. Se puede mandar sólo texto,
 * sólo imágenes, o ambos.
 */
export function FormularioComentario({ tareaId }: { tareaId: string }) {
  const t = useTranslations('comentarios');
  const te = useTranslations('errores');
  const [texto, setTexto] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const vistas = archivos.map((a) => URL.createObjectURL(a));
  useEffect(() => () => vistas.forEach((v) => URL.revokeObjectURL(v)), [vistas]);

  const agregar = (lista: FileList | File[] | null) => {
    if (!lista) return;
    const nuevos: File[] = [];
    for (const f of Array.from(lista)) {
      if (!f.type.startsWith('image/')) { setError(te('noImagen', { nombre: f.name })); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setError(te('muyGrande', { nombre: f.name, mb: MAX_MB })); continue; }
      nuevos.push(f);
    }
    if (nuevos.length) { setError(null); setArchivos((a) => [...a, ...nuevos]); }
  };

  const enviar = async () => {
    if (enviando || (!texto.trim() && archivos.length === 0)) return;
    setEnviando(true); setError(null);
    const fd = new FormData();
    fd.set('texto', texto);
    archivos.forEach((a) => fd.append('archivos', a, a.name || 'imagen.png'));
    try {
      const r = await fetch(`/api/tareas/${tareaId}/comentarios`, { method: 'POST', body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(te(j?.error ?? 'generico', { nombre: j?.nombre ?? '', mb: MAX_MB }));
      }
      setTexto(''); setArchivos([]); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : te('generico'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className={`tarjeta p-3 transition-colors ${arrastrando ? 'border-acento bg-acento/5' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); agregar(e.dataTransfer.files); }}
    >
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); agregar(e.clipboardData.files); } }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void enviar(); }}
        rows={3}
        className="w-full resize-y bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        placeholder={t('placeholder')}
      />
      {archivos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {archivos.map((a, i) => (
            <span key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vistas[i]} alt={a.name} className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
              <button type="button" onClick={() => setArchivos((l) => l.filter((_, k) => k !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white" aria-label={t('quitar')}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <input ref={entrada} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { agregar(e.target.files); e.target.value = ''; }} />
        <button type="button" onClick={() => entrada.current?.click()} className="boton-suave"><ImagePlus size={14} /> {t('imagen')}</button>
        {error && <span className="text-xs text-red-600">{error}</span>}
        <span className="ml-auto text-[11px] text-gray-400">Ctrl+Enter</span>
        <button type="button" onClick={() => void enviar()} disabled={enviando || (!texto.trim() && archivos.length === 0)} className="boton">
          <Send size={14} /> {enviando ? t('enviando') : archivos.length && !texto.trim() ? t('adjuntar') : t('comentar')}
        </button>
      </div>
    </div>
  );
}
