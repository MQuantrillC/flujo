'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ChevronDown, Layers, Rows3 } from 'lucide-react';
import { moverTareaAccion } from '@/lib/acciones';
import { Tooltip } from './Tooltip';

export const TIPO_ARRASTRE = 'application/x-flujo-tarea';

// Si alguien prefiere ver las hechas una por una, se le recuerda en este navegador.
// (Se lee con useSyncExternalStore para que el servidor pinte «apilada» y el
// navegador corrija sin parpadeo raro ni setState dentro de un efecto.)
const oyentes = new Set<() => void>();
const suscribir = (cb: () => void) => { oyentes.add(cb); return () => { oyentes.delete(cb); }; };
function usePila(etapaId: string, porDefecto: boolean): [boolean, (v: boolean) => void] {
  const clave = `flujo_pila_${etapaId}`;
  const leer = () => { try { const v = localStorage.getItem(clave); return v === null ? porDefecto : v === '1'; } catch { return porDefecto; } };
  const apilada = useSyncExternalStore(suscribir, leer, () => porDefecto);
  const fijar = (v: boolean) => { try { localStorage.setItem(clave, v ? '1' : '0'); } catch { /* sin almacenamiento */ } oyentes.forEach((f) => f()); };
  return [apilada, fijar];
}

/**
 * Una columna del tablero que recibe tarjetas arrastradas y las mueve a su etapa.
 * En el móvil ocupa casi todo el ancho y el tablero se pasa columna a columna.
 *
 * Cualquier columna se puede apilar: una sola pila con el conteo y los primeros
 * títulos, que se despliega tocándola (o con el botón de la cabecera). La de
 * «hecho» arranca apilada, porque lo terminado ya no se actúa, sólo se consulta.
 */
export function ColumnaTablero({ etapaId, nombre, cantidad, vacio, esFinal = false, resumen = [], children }: {
  etapaId: string; nombre: string; cantidad: number; vacio: string;
  esFinal?: boolean; resumen?: { id: string; titulo: string }[]; children: React.ReactNode;
}) {
  const t = useTranslations('tablero');
  const [encima, setEncima] = useState(false);
  const [apilada, fijarApilada] = usePila(etapaId, esFinal);
  const [, iniciar] = useTransition();
  const router = useRouter();
  const alternar = () => fijarApilada(!apilada);
  const enPila = apilada && cantidad > 0;

  return (
    <section
      className={`flex w-[84vw] shrink-0 snap-center flex-col gap-2 rounded-xl p-2 transition-colors sm:w-72 sm:snap-align-none ${encima ? 'bg-acento/10 ring-2 ring-acento/40' : 'bg-gray-200/50'}`}
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
        <span className="flex items-center gap-1.5">
          {nombre} <span className="rounded-full bg-white px-1.5 text-[10px] text-gray-500">{cantidad}</span>
        </span>
        {cantidad > 0 && (
          <Tooltip texto={apilada ? t('desplegar') : t('apilar')}>
            <button type="button" onClick={alternar} aria-pressed={apilada} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-700">
              {apilada ? <Rows3 size={13} /> : <Layers size={13} />}
            </button>
          </Tooltip>
        )}
      </h2>

      {enPila ? (
        <button type="button" onClick={alternar} className="group relative mt-3 text-left">
          {/* Dos «tarjetas» asomando por detrás: la pila. */}
          <span aria-hidden className="absolute inset-x-4 -top-3 h-6 rounded-t-xl border border-gray-200 bg-white/60" />
          <span aria-hidden className="absolute inset-x-2 -top-1.5 h-6 rounded-t-xl border border-gray-200 bg-white/90" />
          <span className="relative block rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow group-hover:shadow-md">
            <span className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1.5">
                {esFinal ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Layers size={14} className="text-acento" />}
                {t(esFinal ? 'hechasN' : 'pendientesN', { n: cantidad })}
              </span>
              <ChevronDown size={14} className="text-gray-400 transition-transform group-hover:translate-y-0.5" />
            </span>
            <span className="mt-2 flex flex-col gap-0.5">
              {resumen.slice(0, 3).map((r) => <span key={r.id} className={`truncate text-xs ${esFinal ? 'text-gray-400 line-through' : 'text-gray-600'}`}>{r.titulo}</span>)}
              {cantidad > 3 && <span className="text-[11px] text-gray-400">{t('yMas', { n: cantidad - 3 })}</span>}
            </span>
            <span className="mt-2 block text-[11px] font-semibold text-acento">{t('desplegar')}</span>
          </span>
        </button>
      ) : children}
      {cantidad === 0 && <p className="px-1 py-4 text-center text-xs text-gray-400">{encima ? t('sueltaAqui') : vacio}</p>}
    </section>
  );
}
