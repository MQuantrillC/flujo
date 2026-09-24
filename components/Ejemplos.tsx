'use client';

import { useEffect, useState } from 'react';

type Fase = 'escribiendo' | 'quieto' | 'borrando';
interface Estado { i: number; n: number; fase: Fase }

const PAUSA_LEYENDO = 2800;
const PAUSA_TRAS_BORRAR = 350;

/** Pinta «@nombre» y «#etiqueta» en color de acento y «!» en rojo, como en la lectura de la línea. */
function Coloreado({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\s+)/).map((tk, i) => {
        if (/^[@#]/.test(tk)) return <span key={i} className="font-semibold text-acento">{tk}</span>;
        if (/^!/.test(tk)) return <span key={i} className="font-semibold text-red-500">{tk}</span>;
        return <span key={i}>{tk}</span>;
      })}
    </>
  );
}

/**
 * Los ejemplos de la línea rápida, escritos letra a letra y uno tras otro. Al
 * tocar uno, se copia al campo para editarlo. Con «reducir movimiento» activo,
 * se muestran enteros y van rotando sin animación.
 */
export function Ejemplos({ ejemplos, etiqueta, onElegir }: { ejemplos: string[]; etiqueta: string; onElegir: (texto: string) => void }) {
  const [estado, setEstado] = useState<Estado>({ i: 0, n: 0, fase: 'escribiendo' });
  const actual = ejemplos[estado.i % Math.max(1, ejemplos.length)] ?? '';

  useEffect(() => {
    if (ejemplos.length === 0) return;
    const siguiente = (i: number) => (i + 1) % ejemplos.length;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let espera = 0;
    let proximo: Estado;
    if (reducido) {
      if (estado.n !== actual.length) { espera = 0; proximo = { ...estado, n: actual.length, fase: 'quieto' }; }
      else { espera = 4000; const i = siguiente(estado.i); proximo = { i, n: ejemplos[i].length, fase: 'quieto' }; }
    } else if (estado.fase === 'escribiendo') {
      if (estado.n < actual.length) { espera = 24 + Math.random() * 40 + (/[\s]/.test(actual[estado.n]) ? 40 : 0); proximo = { ...estado, n: estado.n + 1 }; }
      else { espera = PAUSA_LEYENDO; proximo = { ...estado, fase: 'borrando' }; }
    } else if (estado.fase === 'borrando') {
      if (estado.n > 0) { espera = 9; proximo = { ...estado, n: Math.max(0, estado.n - 2) }; }
      else { espera = PAUSA_TRAS_BORRAR; proximo = { i: siguiente(estado.i), n: 0, fase: 'escribiendo' }; }
    } else { espera = PAUSA_LEYENDO; proximo = { ...estado, fase: 'borrando' }; }
    const id = window.setTimeout(() => setEstado(proximo), espera);
    return () => window.clearTimeout(id);
  }, [estado, actual, ejemplos]);

  if (ejemplos.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onElegir(actual)}
      className="group inline-flex min-w-0 max-w-full items-baseline gap-1.5 rounded-md text-left text-xs text-gray-500 transition-colors hover:text-gray-700"
    >
      <span className="shrink-0 text-gray-400">{etiqueta}</span>
      <span className="cursor-escritura min-w-0 truncate font-medium" aria-live="off"><Coloreado texto={actual.slice(0, estado.n)} /></span>
    </button>
  );
}
