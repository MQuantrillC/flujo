'use client';

// Animaciones con motion (motion.dev). Los componentes de servidor envuelven sus
// listas y tarjetas con esto: la tarjeta entra con un fundido y, cuando cambia
// de columna, viaja a su nuevo sitio en vez de aparecer de golpe.

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';

export function GrupoAnimado({ children }: { children: React.ReactNode }) {
  return <LayoutGroup>{children}</LayoutGroup>;
}

/** Con `etapaId`, la tarjeta también se puede arrastrar a otra columna del tablero. */
export function TarjetaAnimada({ id, etapaId, children }: { id: string; etapaId?: string; children: React.ReactNode }) {
  return (
    <motion.div
      layout
      layoutId={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, layout: { type: 'spring', stiffness: 400, damping: 32 } }}
      draggable={!!etapaId}
      data-tarea={etapaId ? id : undefined}
      className={etapaId ? 'cursor-grab active:cursor-grabbing' : undefined}
      onDragStart={(e) => {
        if (!etapaId) return;
        const dt = (e as unknown as React.DragEvent).dataTransfer;
        dt.setData('application/x-flujo-tarea', id);
        dt.setData('text/x-flujo-etapa', etapaId);
        dt.effectAllowed = 'move';
      }}
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
