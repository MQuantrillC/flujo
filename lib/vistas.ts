// ──────────────────────────────────────────────────────────────────────────────
// VISTAS — cómo se agrupan las tareas para «Lo mío», «Esta semana» y «Por persona».
// Puro, para poder probarlo.
// ──────────────────────────────────────────────────────────────────────────────

import { aIso, diasHasta, sumarDias, viernesDeLaSemana } from './fechas';
import type { Tarea, Usuario } from './modelo';

export interface Grupo { titulo: string; tareas: Tarea[] }

/** Por fecha límite, en orden (nulos al final) y con las de prioridad alta primero dentro del mismo día. */
export function ordenarPorPlazo(tareas: Tarea[]): Tarea[] {
  return [...tareas].sort((a, b) => {
    if (a.fechaLimite !== b.fechaLimite) {
      if (!a.fechaLimite) return 1;
      if (!b.fechaLimite) return -1;
      return a.fechaLimite < b.fechaLimite ? -1 : 1;
    }
    if (a.prioridad !== b.prioridad) return a.prioridad === 'alta' ? -1 : 1;
    return a.creadoEn - b.creadoEn;
  });
}

/** Vencidas · Hoy · Esta semana · Próxima semana · Después · Sin fecha. Sólo grupos con algo. */
export function agruparPorPlazo(tareas: Tarea[], hoy: Date): Grupo[] {
  const viernes = aIso(viernesDeLaSemana(hoy));
  const viernesSiguiente = aIso(sumarDias(viernesDeLaSemana(hoy), 7));
  const grupos: Grupo[] = [
    { titulo: 'Vencidas', tareas: [] }, { titulo: 'Hoy', tareas: [] }, { titulo: 'Esta semana', tareas: [] },
    { titulo: 'Próxima semana', tareas: [] }, { titulo: 'Después', tareas: [] }, { titulo: 'Sin fecha', tareas: [] },
  ];
  for (const t of ordenarPorPlazo(tareas)) {
    if (!t.fechaLimite) grupos[5].tareas.push(t);
    else {
      const n = diasHasta(t.fechaLimite, hoy);
      if (n < 0) grupos[0].tareas.push(t);
      else if (n === 0) grupos[1].tareas.push(t);
      else if (t.fechaLimite <= viernes) grupos[2].tareas.push(t);
      else if (t.fechaLimite <= viernesSiguiente) grupos[3].tareas.push(t);
      else grupos[4].tareas.push(t);
    }
  }
  return grupos.filter((g) => g.tareas.length > 0);
}

/** Lo que vence hasta el viernes, día por día, con las vencidas primero. */
export function agruparSemana(tareas: Tarea[], hoy: Date): Grupo[] {
  const viernes = aIso(viernesDeLaSemana(hoy));
  const vencidas: Tarea[] = [];
  const porDia = new Map<string, Tarea[]>();
  for (const t of ordenarPorPlazo(tareas)) {
    if (!t.fechaLimite || t.fechaLimite > viernes) continue;
    if (diasHasta(t.fechaLimite, hoy) < 0) vencidas.push(t);
    else porDia.set(t.fechaLimite, [...(porDia.get(t.fechaLimite) ?? []), t]);
  }
  const grupos: Grupo[] = vencidas.length ? [{ titulo: 'Vencidas', tareas: vencidas }] : [];
  for (const [iso, lista] of [...porDia.entries()].sort()) grupos.push({ titulo: iso, tareas: lista });
  return grupos;
}

export interface GrupoPersona { email: string | null; nombre: string; tareas: Tarea[] }

/** Una lista por persona del equipo (en su orden) y, al final, las que no tienen responsable. */
export function agruparPorPersona(tareas: Tarea[], miembros: Usuario[]): GrupoPersona[] {
  const ordenadas = ordenarPorPlazo(tareas);
  const grupos: GrupoPersona[] = miembros.map((m) => ({ email: m.email, nombre: m.nombre, tareas: ordenadas.filter((t) => t.asignados.includes(m.email)) }));
  const sinNadie = ordenadas.filter((t) => t.asignados.length === 0);
  if (sinNadie.length) grupos.push({ email: null, nombre: 'Sin responsable', tareas: sinNadie });
  return grupos.filter((g) => g.tareas.length > 0);
}

/** Todas las etiquetas en uso, con cuántas tareas tiene cada una, de más a menos. */
export function etiquetasEnUso(tareas: Tarea[]): { etiqueta: string; n: number }[] {
  const m = new Map<string, number>();
  for (const t of tareas) for (const e of t.etiquetas) m.set(e, (m.get(e) ?? 0) + 1);
  return [...m.entries()].map(([etiqueta, n]) => ({ etiqueta, n })).sort((a, b) => b.n - a.n || a.etiqueta.localeCompare(b.etiqueta));
}
