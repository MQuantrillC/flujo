'use client';

// ──────────────────────────────────────────────────────────────────────────────
// DIÁLOGO — la ventana modal de la app, en lugar del confirm()/alert() del
// navegador. Un fondo que oscurece, una tarjeta centrada con título, texto y
// botones. Se cierra con Esc, pulsando fuera o con «Cancelar».
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

const nada = () => () => {};
const useMontado = () => useSyncExternalStore(nada, () => true, () => false);

export function Dialogo({ abierto, onCerrar, titulo, children, acciones, peligro = false }: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
  /** Los botones de la derecha; «Cancelar» va siempre. */
  acciones?: React.ReactNode;
  /** Pinta el título en rojo: algo que no se deshace. */
  peligro?: boolean;
}) {
  const t = useTranslations('comun');
  const montado = useMontado();

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto, onCerrar]);

  if (!montado) return null;

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-gray-900/40 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo"
            className="tarjeta w-full max-w-sm p-5 shadow-xl"
            initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.18 }}
          >
            <h2 id="dialogo-titulo" className={`mb-2 font-semibold ${peligro ? 'text-red-700' : 'text-gray-800'}`}>{titulo}</h2>
            <div className="text-sm leading-relaxed text-gray-600">{children}</div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onCerrar} className="boton-suave" autoFocus>{t('cancelar')}</button>
              {acciones}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
