'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moverTareaAccion } from '@/lib/acciones';

export const TIPO_ARRASTRE = 'application/x-flujo-tarea';

/** Una columna del tablero que recibe tarjetas arrastradas y las mueve a su etapa. */
export function ColumnaTablero({ etapaId, nombre, cantidad, vacio, children }: {
  etapaId: string; nombre: string; cantidad: number; vacio: string; children: React.ReactNode;
}) {
  const [encima, setEncima] = useState(false);
  const [, iniciar] = useTransition();
  const router = useRouter();

  return (
    <section
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-xl p-2 transition-colors ${encima ? 'bg-acento/10 ring-2 ring-acento/40' : 'bg-gray-200/50'}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(TIPO_ARRASTRE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!encima) setEncima(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        const tareaId = e.dataTransfer.getData(TIPO_ARRASTRE);
        const desde = e.dataTransfer.getData('text/x-flujo-etapa');
        if (!tareaId || desde === etapaId) return;
        iniciar(async () => { await moverTareaAccion(tareaId, etapaId); router.refresh(); });
      }}
    >
      <h2 className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
        {nombre} <span className="rounded-full bg-white px-1.5 text-[10px] text-gray-500">{cantidad}</span>
      </h2>
      {children}
      {cantidad === 0 && <p className="px-1 py-4 text-center text-xs text-gray-400">{encima ? 'Suelta aquí' : vacio}</p>}
    </section>
  );
}
