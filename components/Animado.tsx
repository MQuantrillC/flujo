'use client';

// Animaciones con motion (motion.dev). Los componentes de servidor envuelven sus
// listas y tarjetas con esto: la tarjeta entra con un fundido y, cuando cambia
// de columna, viaja a su nuevo sitio en vez de aparecer de golpe.

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';

export function GrupoAnimado({ children }: { children: React.ReactNode }) {
  return <LayoutGroup>{children}</LayoutGroup>;
}

export function TarjetaAnimada({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <motion.div
      layout
      layoutId={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, layout: { type: 'spring', stiffness: 400, damping: 32 } }}
    >
      {children}
    </motion.div>
  );
}

/** Aparece y desaparece con suavidad (paneles, avisos). */
export function Aparece({ visible, children, className }: { visible: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className={className} initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.14 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
