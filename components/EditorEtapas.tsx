'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Check, Circle, CircleCheck, GripVertical, Trash2 } from 'lucide-react';
import {
  agregarEtapaAccion, eliminarEtapaAccion, marcarEtapaFinalAccion, moverEtapaAccion, renombrarEtapaAccion, reordenarEtapasAccion,
} from '@/lib/acciones';
import type { Etapa } from '@/lib/modelo';
import { FormConfirmar } from './FormConfirmar';
import { Tooltip } from './Tooltip';

const TIPO = 'application/x-flujo-etapa-orden';

/**
 * Las etapas del equipo: renombrar, marcar «hecho», eliminar, y ordenar. Para
 * ordenar valen las flechas (también en el móvil) o arrastrar por el asa: el
 * orden nuevo se ve al instante y se guarda en segundo plano.
 */
export function EditorEtapas({ equipoId, etapas: delServidor, enUso }: { equipoId: string; etapas: Etapa[]; enUso: Record<string, number> }) {
  const t = useTranslations('miembros');
  const tc = useTranslations('comun');
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [etapas, setEtapas] = useState(delServidor);
  const [previas, setPrevias] = useState(delServidor);
  if (previas !== delServidor) { setPrevias(delServidor); setEtapas(delServidor); }
  const [asible, setAsible] = useState<string | null>(null);     // la fila cuya asa se está sujetando
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const limpiar = () => { setAsible(null); setArrastrando(null); setSobre(null); };

  const soltar = (destinoId: string) => {
    const origen = arrastrando;
    limpiar();
    if (!origen || origen === destinoId) return;
    const lista = [...etapas];
    const i = lista.findIndex((x) => x.id === origen);
    const k = lista.findIndex((x) => x.id === destinoId);
    const [movida] = lista.splice(i, 1);
    lista.splice(k, 0, movida); // hacia abajo queda después del destino; hacia arriba, antes
    setEtapas(lista);
    iniciar(async () => { await reordenarEtapasAccion(equipoId, lista.map((x) => x.id)); router.refresh(); });
  };

  const botonIcono = 'rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 disabled:opacity-30';

  return (
    <>
      <ul className="flex flex-col gap-2">
        {etapas.map((et, i) => {
          const n = enUso[et.id] ?? 0;
          return (
            <li
              key={et.id}
              draggable={asible === et.id}
              onDragStart={(e) => { e.dataTransfer.setData(TIPO, et.id); e.dataTransfer.effectAllowed = 'move'; setArrastrando(et.id); }}
              onDragEnd={limpiar}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(TIPO)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== et.id) setSobre(et.id); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && sobre === et.id) setSobre(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(et.id); }}
              className={`flex items-center gap-1.5 rounded-lg border p-2 transition-all ${
                arrastrando === et.id ? 'border-gray-200 bg-gray-50/60 opacity-40'
                : sobre === et.id ? 'border-acento bg-acento/10 ring-2 ring-acento/30'
                : 'border-gray-100 bg-gray-50/60'
              }`}
            >
              <Tooltip texto={t('arrastrar')}>
                <span
                  onPointerDown={() => setAsible(et.id)}
                  onPointerUp={() => { if (!arrastrando) setAsible(null); }}
                  className="cursor-grab touch-none rounded-md p-0.5 text-gray-300 transition-colors hover:bg-gray-200 hover:text-gray-500 active:cursor-grabbing"
                  aria-hidden
                >
                  <GripVertical size={14} />
                </span>
              </Tooltip>
              <form action={renombrarEtapaAccion} className="flex min-w-0 flex-1 gap-1.5">
                <input type="hidden" name="equipoId" value={equipoId} />
                <input type="hidden" name="etapaId" value={et.id} />
                <input name="nombre" defaultValue={et.nombre} className="campo py-1" />
                <Tooltip texto={t('guardarNombre')}><button className="boton-suave py-1"><Check size={14} /></button></Tooltip>
              </form>
              <Tooltip texto={t('pendientesEn')}><span className="w-8 text-center text-[11px] text-gray-400">{n}</span></Tooltip>
              <form action={moverEtapaAccion}><input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} /><input type="hidden" name="direccion" value="-1" />
                <Tooltip texto={t('subir')}><button disabled={i === 0} className={botonIcono}><ArrowUp size={14} /></button></Tooltip></form>
              <form action={moverEtapaAccion}><input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} /><input type="hidden" name="direccion" value="1" />
                <Tooltip texto={t('bajar')}><button disabled={i === etapas.length - 1} className={botonIcono}><ArrowDown size={14} /></button></Tooltip></form>
              <form action={marcarEtapaFinalAccion}><input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} />
                <Tooltip texto={et.esFinal ? t('hechoEtapa') : t('esHecho')}>
                  <button aria-pressed={et.esFinal} aria-label={t('hecho')} className={`rounded-md p-1 transition-colors ${et.esFinal ? 'text-emerald-600' : 'text-gray-300 hover:bg-gray-200 hover:text-emerald-500'}`}>
                    {et.esFinal ? <CircleCheck size={17} className="fill-emerald-100" /> : <Circle size={17} />}
                  </button>
                </Tooltip></form>
              <FormConfirmar action={eliminarEtapaAccion} peligro mensaje={t('confirmarEliminarEtapa', { nombre: et.nombre })}>
                <input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} />
                <Tooltip texto={n > 0 ? t('tienePendientes') : t('eliminar')}><button disabled={n > 0 || etapas.length <= 1} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={14} /></button></Tooltip>
              </FormConfirmar>
            </li>
          );
        })}
      </ul>
      <form action={agregarEtapaAccion} className="mt-3 flex gap-2">
        <input type="hidden" name="equipoId" value={equipoId} />
        <input name="nombre" required className="campo" placeholder={t('nuevaEtapa')} autoComplete="off" />
        <button className="boton-suave">{tc('agregar')}</button>
      </form>
    </>
  );
}
