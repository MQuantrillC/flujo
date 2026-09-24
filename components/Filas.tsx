'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface Columna { name: string; placeholder?: string; type?: string; className?: string; required?: boolean }

/**
 * Filas de campos con [+] para agregar otra y [x] para quitarla: los enlaces de
 * un pendiente, los correos de un equipo. Cada columna manda un campo con el
 * mismo `name` por fila, así el servidor los lee con `formData.getAll`.
 */
export function Filas({ columnas, inicial, agregar, quitar, minimo = 1 }: {
  columnas: Columna[];
  /** Una lista de valores por fila, en el orden de `columnas`. */
  inicial: string[][];
  agregar: string;
  quitar: string;
  minimo?: number;
}) {
  const vacia = () => ({ id: Math.random().toString(36).slice(2), valores: columnas.map(() => '') });
  const [filas, setFilas] = useState(() => {
    const base = inicial.map((v) => ({ id: Math.random().toString(36).slice(2), valores: columnas.map((_, i) => v[i] ?? '') }));
    while (base.length < minimo) base.push(vacia());
    return base;
  });
  const cambiar = (id: string, i: number, v: string) => setFilas((f) => f.map((x) => (x.id === id ? { ...x, valores: x.valores.map((y, k) => (k === i ? v : y)) } : x)));
  const quitarFila = (id: string) => setFilas((f) => (f.length > minimo ? f.filter((x) => x.id !== id) : f.map((x) => (x.id === id ? { ...x, valores: columnas.map(() => '') } : x))));

  return (
    <div className="flex flex-col gap-1.5">
      {filas.map((fila) => (
        <div key={fila.id} className="flex items-center gap-1.5">
          {columnas.map((c, i) => (
            <input
              key={c.name}
              name={c.name}
              type={c.type ?? 'text'}
              value={fila.valores[i]}
              onChange={(e) => cambiar(fila.id, i, e.target.value)}
              placeholder={c.placeholder}
              required={c.required}
              autoComplete="off"
              className={`campo min-w-0 ${c.className ?? ''}`}
            />
          ))}
          <Tooltip texto={quitar}>
            <button type="button" onClick={() => quitarFila(fila.id)} aria-label={quitar} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"><X size={14} /></button>
          </Tooltip>
        </div>
      ))}
      <button type="button" onClick={() => setFilas((f) => [...f, vacia()])} className="flex w-fit items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-acento transition-colors hover:bg-acento/10">
        <Plus size={13} /> {agregar}
      </button>
    </div>
  );
}
