// ──────────────────────────────────────────────────────────────────────────────
// PASAR PENDIENTES DE UN EQUIPO A OTRO
//
// La parte pura: qué pendientes entran según el filtro elegido, y a qué etapa
// del otro equipo va cada uno. Lo comparten la pantalla (para contar en vivo)
// y la acción del servidor (para no fiarse de lo que mande el navegador).
// ──────────────────────────────────────────────────────────────────────────────

import type { Etapa, Tarea } from './modelo';

export const FILTROS = ['abiertos', 'mios', 'etiqueta', 'todos'] as const;
export type Filtro = (typeof FILTROS)[number];
export const MODOS = ['copiar', 'mover'] as const;
export type Modo = (typeof MODOS)[number];

export type TareaResumida = Pick<Tarea, 'id' | 'etapaId' | 'asignados' | 'etiquetas'>;

export const esFiltro = (v: string): v is Filtro => (FILTROS as readonly string[]).includes(v);
export const esModo = (v: string): v is Modo => (MODOS as readonly string[]).includes(v);

/** Los pendientes que entran: por defecto sólo los abiertos (los hechos son historial). */
export function seleccionar<T extends TareaResumida>(tareas: T[], finales: Set<string>, filtro: Filtro, etiqueta: string, yo: string): T[] {
  const abiertas = tareas.filter((t) => !finales.has(t.etapaId));
  switch (filtro) {
    case 'todos': return tareas;
    case 'mios': return abiertas.filter((t) => t.asignados.includes(yo));
    case 'etiqueta': return etiqueta ? abiertas.filter((t) => t.etiquetas.includes(etiqueta)) : [];
    default: return abiertas;
  }
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Para los pendientes vinculados: cuando uno cambia de etapa, a cuál va su
 * gemelo en el otro equipo. Sólo si hay una etapa con el mismo nombre, o si la
 * nueva es «hecho» (entonces a la «hecho» de allá). Si no, null: se queda donde está.
 */
export function etapaEspejo(nueva: Etapa, destino: Etapa[]): Etapa | null {
  const n = normalizar(nueva.nombre);
  return destino.find((e) => normalizar(e.nombre) === n) ?? (nueva.esFinal ? destino.find((e) => e.esFinal) ?? null : null);
}

/** La etapa del destino con el mismo nombre; si no la hay, la primera que no sea «hecho» (o «hecho» si venía de una «hecho»). */
export function etapaEquivalente(origen: Etapa, destino: Etapa[]): Etapa {
  const n = normalizar(origen.nombre);
  return destino.find((e) => normalizar(e.nombre) === n)
    ?? (origen.esFinal ? destino.find((e) => e.esFinal) : undefined)
    ?? destino.find((e) => !e.esFinal)
    ?? destino[0];
}
