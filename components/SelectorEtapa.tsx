'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, CircleCheck } from 'lucide-react';
import { moverTareaAccion } from '@/lib/acciones';
import type { Etapa } from '@/lib/modelo';
import { Flotante, medir, type Ancla } from './Flotante';

/**
 * El desplegable de etapa, con el estilo de la app. Dos usos:
 *  - con `tareaId`, en la tarjeta: elegir mueve la tarea al instante;
 *  - con `name`, dentro de un formulario: sólo cambia un campo oculto.
 */
export function SelectorEtapa({ etapas, etapaId, tareaId, name, tam = 'sm' }: {
  etapas: Etapa[]; etapaId: string; tareaId?: string; name?: string; tam?: 'sm' | 'md';
}) {
  const t = useTranslations('tarjeta');
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [valor, setValor] = useState(etapaId);
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const [indice, setIndice] = useState(0);
  // Si la tarea se movió por otro camino (arrastre, otra pestaña), el servidor manda otra etapa: se adopta.
  const [etapaVista, setEtapaVista] = useState(etapaId);
  if (etapaVista !== etapaId) { setEtapaVista(etapaId); setValor(etapaId); }
  const actual = etapas.find((e) => e.id === valor) ?? etapas[0];
  const abierto = !!ancla;

  const abrir = (el: HTMLElement) => { setIndice(Math.max(0, etapas.findIndex((e) => e.id === valor))); setAncla(medir(el)); };
  const cerrar = () => setAncla(null);

  const elegir = (e: Etapa) => {
    cerrar();
    if (e.id === valor) return;
    setValor(e.id);
    if (tareaId) iniciar(async () => { await moverTareaAccion(tareaId, e.id); router.refresh(); });
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!abierto) {
      if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(ev.currentTarget); }
      return;
    }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setIndice((i) => (i + 1) % etapas.length); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setIndice((i) => (i - 1 + etapas.length) % etapas.length); }
    else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); elegir(etapas[indice]); }
    else if (ev.key === 'Tab') cerrar();
  };

  const chico = tam === 'sm';
  const color = actual?.esFinal ? 'bg-emerald-500' : 'bg-acento';

  return (
    <>
      {name && <input type="hidden" name={name} value={valor} />}
      <button
        type="button"
        disabled={pendiente}
        onClick={(e) => { e.stopPropagation(); if (abierto) cerrar(); else abrir(e.currentTarget); }}
        onKeyDown={onKeyDown}
        onBlur={cerrar}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={t('etapa')}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 outline-none transition-colors hover:border-acento/60 focus-visible:border-acento focus-visible:ring-2 focus-visible:ring-acento/20 disabled:opacity-50 ${chico ? 'px-2 py-0.5 text-[11px]' : 'campo justify-between'}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />
        <span className="truncate">{actual?.nombre}</span>
        <ChevronDown size={chico ? 12 : 14} className={`shrink-0 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      <Flotante abierto={abierto} ancla={ancla} lado="abajo" alinear={chico ? 'derecha' : 'izquierda'} alto={etapas.length * 34 + 12} onCerrar={cerrar} rol="listbox" className="min-w-40">
        <ul className="overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          {etapas.map((e, i) => {
            const elegida = e.id === valor;
            return (
              <li
                key={e.id}
                role="option"
                aria-selected={elegida}
                onMouseEnter={() => setIndice(i)}
                onClick={(ev) => { ev.stopPropagation(); elegir(e); }}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${i === indice ? 'bg-acento/10 text-acento' : 'text-gray-700'}`}
              >
                {e.esFinal ? <CircleCheck size={14} className={elegida ? 'text-emerald-600' : 'text-gray-400'} /> : <span className={`ml-1 mr-1 h-1.5 w-1.5 rounded-full ${elegida ? 'bg-acento' : 'bg-gray-300'}`} />}
                <span className="flex-1 truncate">{e.nombre}</span>
                {elegida && <Check size={14} />}
              </li>
            );
          })}
        </ul>
      </Flotante>
    </>
  );
}
