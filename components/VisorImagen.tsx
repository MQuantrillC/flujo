'use client';

// ──────────────────────────────────────────────────────────────────────────────
// VISOR — la imagen a tamaño completo dentro de la app, sobre un fondo oscuro,
// en vez de abrirla en otra pestaña. Si viene con un grupo (las imágenes del
// mismo comentario o del mismo pendiente), se pasa de una a otra con las
// flechas. Esc o pulsar fuera cierra; hay botones para descargar y abrir aparte.
// ──────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface ImagenVisor { id: string; nombre: string }

const nada = () => () => {};
const useMontado = () => useSyncExternalStore(nada, () => true, () => false);
const urlDe = (id: string) => `/api/adjuntos/${id}`;

/** La miniatura que, al pulsarla, abre el visor. `grupo` son las imágenes hermanas (ella incluida). */
export function VisorImagen({ imagen, grupo, className = '' }: { imagen: ImagenVisor; grupo?: ImagenVisor[]; className?: string }) {
  const t = useTranslations('visor');
  const montado = useMontado();
  const lista = grupo && grupo.length ? grupo : [imagen];
  const [indice, setIndice] = useState<number | null>(null);
  const abierto = indice !== null;
  const actual = abierto ? lista[indice] : null;
  const n = lista.length;

  const cerrar = useCallback(() => setIndice(null), []);
  const ir = useCallback((paso: number) => setIndice((i) => (i === null ? i : (i + paso + n) % n)), [n]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight' && n > 1) ir(1);
      else if (e.key === 'ArrowLeft' && n > 1) ir(-1);
    };
    window.addEventListener('keydown', tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = anterior; };
  }, [abierto, n, cerrar, ir]);

  const boton = 'rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25';

  return (
    <>
      <button type="button" onClick={() => setIndice(Math.max(0, lista.findIndex((x) => x.id === imagen.id)))} className={`block cursor-zoom-in ${className}`} aria-label={t('abrir', { nombre: imagen.nombre })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlDe(imagen.id)} alt={imagen.nombre} className="h-28 w-28 rounded-lg border border-gray-200 object-cover transition-transform hover:scale-[1.02]" loading="lazy" />
      </button>
      {montado && createPortal(
        <AnimatePresence>
          {actual && (
            <motion.div
              className="fixed inset-0 z-[110] flex flex-col bg-black/90"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              role="dialog" aria-modal="true" aria-label={actual.nombre}
            >
              <div className="flex items-center gap-2 px-3 py-2 text-white">
                <span className="min-w-0 flex-1 truncate text-sm">{actual.nombre}{n > 1 && <span className="ml-2 text-white/50">{t('contador', { i: indice! + 1, n })}</span>}</span>
                <a href={urlDe(actual.id)} download={actual.nombre} className={boton} aria-label={t('descargar')} title={t('descargar')}><Download size={18} /></a>
                <a href={urlDe(actual.id)} target="_blank" rel="noopener" className={boton} aria-label={t('abrirPestana')} title={t('abrirPestana')}><ExternalLink size={18} /></a>
                <button type="button" onClick={cerrar} className={boton} aria-label={t('cerrar')} title={t('cerrar')} autoFocus><X size={18} /></button>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
                {n > 1 && <button type="button" onClick={() => ir(-1)} className={`${boton} absolute left-2 sm:left-4`} aria-label={t('anterior')}><ChevronLeft size={22} /></button>}
                <motion.img
                  key={actual.id}
                  src={urlDe(actual.id)} alt={actual.nombre}
                  className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}
                  draggable={false}
                />
                {n > 1 && <button type="button" onClick={() => ir(1)} className={`${boton} absolute right-2 sm:right-4`} aria-label={t('siguiente')}><ChevronRight size={22} /></button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
