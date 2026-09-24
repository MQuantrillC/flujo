'use client';

// ──────────────────────────────────────────────────────────────────────────────
// FLOTANTE — un panel que flota sobre la página pegado a un elemento (el ancla):
// tooltips, desplegables. Se pinta en un portal con posición fija, así no lo
// recorta ningún contenedor con scroll (el tablero, por ejemplo), y se cierra
// al hacer scroll, cambiar de tamaño o pulsar Esc.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

export interface Ancla { x: number; y: number; w: number; h: number }

export function medir(el: Element): Ancla {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

const SEPARACION = 6;
const MARGEN = 8;

const nada = () => () => {};
/** Verdadero sólo en el navegador, una vez montado: antes no hay `document` para el portal. */
const useMontado = () => useSyncExternalStore(nada, () => true, () => false);

export function Flotante({ abierto, ancla, lado = 'abajo', alinear = 'centro', alto = 200, onCerrar, children, className = '', rol }: {
  abierto: boolean;
  ancla: Ancla | null;
  /** Dónde va respecto al ancla; si no cabe, se da la vuelta. */
  lado?: 'arriba' | 'abajo';
  alinear?: 'centro' | 'izquierda' | 'derecha';
  /** Alto aproximado, para decidir si cabe abajo. */
  alto?: number;
  onCerrar?: () => void;
  children: React.ReactNode;
  className?: string;
  rol?: string;
}) {
  const montado = useMontado();

  useEffect(() => {
    if (!abierto || !onCerrar) return;
    const cerrar = () => onCerrar();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      window.removeEventListener('keydown', tecla);
    };
  }, [abierto, onCerrar]);

  if (!montado) return null;

  let estilo: React.CSSProperties = {};
  let haciaArriba = lado === 'arriba';
  if (ancla) {
    const altoVentana = window.innerHeight;
    const anchoVentana = window.innerWidth;
    if (lado === 'abajo' && ancla.y + ancla.h + SEPARACION + alto > altoVentana && ancla.y > alto) haciaArriba = true;
    if (lado === 'arriba' && ancla.y - SEPARACION - alto < 0) haciaArriba = false;
    estilo = haciaArriba ? { bottom: altoVentana - ancla.y + SEPARACION } : { top: ancla.y + ancla.h + SEPARACION };
    if (alinear === 'centro') { estilo.left = Math.min(Math.max(ancla.x + ancla.w / 2, MARGEN), anchoVentana - MARGEN); estilo.transform = 'translateX(-50%)'; }
    else if (alinear === 'derecha') estilo.right = Math.max(anchoVentana - (ancla.x + ancla.w), MARGEN);
    else estilo.left = Math.max(ancla.x, MARGEN);
    estilo.maxWidth = `calc(100vw - ${MARGEN * 2}px)`;
  }

  return createPortal(
    <AnimatePresence>
      {abierto && ancla && (
        <motion.div
          role={rol}
          className={`fixed z-50 ${className}`}
          style={estilo}
          initial={{ opacity: 0, y: haciaArriba ? 4 : -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: haciaArriba ? 4 : -4, scale: 0.97 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
