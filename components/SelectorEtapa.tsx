'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { moverTareaAccion } from '@/lib/acciones';
import type { Etapa } from '@/lib/modelo';

/** El desplegable de etapa en cada tarjeta: cambiarlo mueve la tarea al instante. */
export function SelectorEtapa({ tareaId, etapaId, etapas }: { tareaId: string; etapaId: string; etapas: Etapa[] }) {
  const t = useTranslations('tarjeta');
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <select
      value={etapaId}
      disabled={pendiente}
      onChange={(e) => { const v = e.target.value; iniciar(async () => { await moverTareaAccion(tareaId, v); router.refresh(); }); }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600 outline-none hover:border-gray-300 focus:border-acento disabled:opacity-50"
      aria-label={t('etapa')}
    >
      {etapas.map((et) => <option key={et.id} value={et.id}>{et.nombre}</option>)}
    </select>
  );
}
