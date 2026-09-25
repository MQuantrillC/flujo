'use client';

import { Children, useState, useSyncExternalStore, useTransition } from 'react';
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

/** Sin hueco elegido: la tarjeta va a otra etapa sin sitio concreto (arriba). */
type Hueco = string | null | undefined;

/**
 * Una columna del tablero que recibe tarjetas arrastradas: de otra etapa (la
 * mueve) o de la misma (la reordena). Mientras se arrastra, una raya marca
 * dónde va a caer. En el móvil ocupa casi todo el ancho y el tablero se pasa
 * columna a columna.
 *
 * Cualquier columna se puede apilar: una sola pila con el conteo y los primeros
 * títulos, que se despliega tocándola (o con el botón de la cabecera). La de
 * «hecho» arranca apilada, porque lo terminado ya no se actúa, sólo se consulta.
 */
export function ColumnaTablero({ etapaId, nombre, cantidad, vacio, esFinal = false, resumen = [], ids = [], children }: {
  etapaId: string; nombre: string; cantidad: number; vacio: string;
  esFinal?: boolean; resumen?: { id: string; titulo: string }[];
  /** Los ids de las tarjetas en el orden en que se ven, para saber dónde cae lo arrastrado. */
  ids?: string[];
  children: React.ReactNode;
}) {
  const t = useTranslations('tablero');
  const [encima, setEncima] = useState(false);
  const [hueco, setHueco] = useState<Hueco>(undefined);
  const [apilada, fijarApilada] = usePila(etapaId, esFinal);
  const [, iniciar] = useTransition();
  const router = useRouter();
  const alternar = () => fijarApilada(!apilada);
  const enPila = apilada && cantidad > 0;

  /** El id de la tarjeta delante de la cual caería el ratón; null = al final. */
  const huecoBajo = (e: React.DragEvent<HTMLElement>): Hueco => {
    if (enPila) return undefined;
    for (const el of e.currentTarget.querySelectorAll<HTMLElement>('[data-tarea]')) {
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) return el.dataset.tarea ?? null;
    }
    return null;
  };

  const salir = () => { setEncima(false); setHueco(undefined); };

  // La raya que marca el hueco, metida entre las tarjetas en el sitio que toca.
  const raya = <div key="__raya" aria-hidden className="h-1 rounded-full bg-acento" />;
  let contenido = children;
  if (encima && hueco !== undefined && !enPila) {
    const lista = Children.toArray(children);
    const i = hueco === null ? lista.length : Math.max(0, ids.indexOf(hueco));
    lista.splice(i, 0, raya);
    contenido = lista;
  }

  return (
    <section
      className={`flex w-[84vw] shrink-0 snap-center flex-col gap-2 rounded-xl p-2 transition-colors sm:w-72 sm:snap-align-none ${encima ? 'fondo-columna-activa ring-2 ring-acento/40' : 'fondo-columna'}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TIPO_ARRASTRE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!encima) setEncima(true);
        const h = huecoBajo(e);
        if (h !== hueco) setHueco(h);
      }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) salir(); }}
      onDrop={(e) => {
        e.preventDefault();
        const destino = huecoBajo(e);
        salir();
        const tareaId = e.dataTransfer.getData(TIPO_ARRASTRE);
        const desde = e.dataTransfer.getData('text/x-flujo-etapa');
        if (!tareaId) return;
        if (desde === etapaId) {
          // Reordenar dentro de la columna: nada que hacer si cae sobre sí misma o justo debajo de donde estaba.
          if (destino === undefined || destino === tareaId) return;
          const i = ids.indexOf(tareaId);
          const siguiente = i >= 0 ? ids[i + 1] ?? null : undefined;
          if (siguiente === destino) return;
        }
        iniciar(async () => { await moverTareaAccion(tareaId, etapaId, destino); router.refresh(); });
      }}
    >
      {/* Pegada justo bajo la cabecera de la página mientras la columna pasa por debajo (sólo en pantallas grandes). */}
      <h2 className="cabecera-columna z-15 -mx-2 -mt-2 flex items-center justify-between rounded-t-xl px-3 pb-2 pt-2 text-xs font-bold uppercase tracking-wider text-gray-500" style={{ top: 'var(--tope-tablero, 0px)' }}>
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
      ) : contenido}
      {cantidad === 0 && <p className="px-1 py-4 text-center text-xs text-gray-400">{encima ? t('sueltaAqui') : vacio}</p>}
    </section>
  );
}
