// ──────────────────────────────────────────────────────────────────────────────
// VISTAS — cómo se agrupan las tareas para «Lo mío», «Esta semana» y «Por persona».
// Puro, para poder probarlo. Los títulos de grupo son claves que la pantalla traduce.
// ──────────────────────────────────────────────────────────────────────────────

import { aIso, diasHasta, sumarDias, viernesDeLaSemana } from './fechas';
import type { Tarea, Usuario } from './modelo';

export type ClaveGrupo = 'vencidas' | 'hoy' | 'estaSemana' | 'proximaSemana' | 'despues' | 'sinFecha';
export interface Grupo { clave: ClaveGrupo | string; tareas: Tarea[] }

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

/**
 * El orden de una columna del tablero: primero lo que nadie ordenó a mano
 * (por plazo, como siempre), y debajo lo que se arrastró, en el sitio elegido.
 * Así lo nuevo aparece arriba y lo acomodado se queda donde se dejó.
 */
export function ordenarColumna(tareas: Tarea[]): Tarea[] {
  const sinSitio = ordenarPorPlazo(tareas.filter((t) => t.posicion === null));
  const conSitio = tareas.filter((t) => t.posicion !== null).sort((a, b) => (a.posicion! - b.posicion!) || a.creadoEn - b.creadoEn);
  return [...sinSitio, ...conSitio];
}

export type Vista = 'tablero' | 'mio' | 'semana' | 'persona';

/**
 * Los pendientes que entran en una vista, antes de filtrar por etiqueta. Es la
 * misma lista que la vista muestra y la que cuentan los chips de etiquetas de
 * arriba, así «#btb 6» dice cuántos hay en lo que estás mirando:
 *  - tablero: los abiertos y los terminados hace poco (desde `corteHechas`);
 *  - lo mío: los abiertos asignados a `email`;
 *  - esta semana: los abiertos que vencen hasta este viernes (incluye vencidos);
 *  - por persona: los abiertos.
 */
export function tareasDeVista(vista: Vista, tareas: Tarea[], { finales, email, hoy, corteHechas }: {
  finales: Set<string>; email: string; hoy: Date; corteHechas: number;
}): Tarea[] {
  const abiertas = tareas.filter((t) => !finales.has(t.etapaId));
  if (vista === 'tablero') return tareas.filter((t) => !finales.has(t.etapaId) || (t.terminadoEn ?? 0) >= corteHechas);
  if (vista === 'mio') return abiertas.filter((t) => t.asignados.includes(email));
  if (vista === 'semana') return abiertas.filter((t) => venceEstaSemana(t, hoy));
  return abiertas;
}

/** Tiene fecha y vence hasta el viernes de esta semana (las vencidas también cuentan). */
export function venceEstaSemana(t: Pick<Tarea, 'fechaLimite'>, hoy: Date): boolean {
  return !!t.fechaLimite && t.fechaLimite <= aIso(viernesDeLaSemana(hoy));
}

/** Vencidas · Hoy · Esta semana · Próxima semana · Después · Sin fecha. Sólo grupos con algo. */
export function agruparPorPlazo(tareas: Tarea[], hoy: Date): Grupo[] {
  const viernes = aIso(viernesDeLaSemana(hoy));
  const viernesSiguiente = aIso(sumarDias(viernesDeLaSemana(hoy), 7));
  const claves: ClaveGrupo[] = ['vencidas', 'hoy', 'estaSemana', 'proximaSemana', 'despues', 'sinFecha'];
  const grupos: Grupo[] = claves.map((clave) => ({ clave, tareas: [] }));
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

/** Lo que vence hasta el viernes, día por día (clave = fecha ISO), con las vencidas primero. */
export function agruparSemana(tareas: Tarea[], hoy: Date): Grupo[] {
  const vencidas: Tarea[] = [];
  const porDia = new Map<string, Tarea[]>();
  for (const t of ordenarPorPlazo(tareas)) {
    if (!t.fechaLimite || !venceEstaSemana(t, hoy)) continue;
    if (diasHasta(t.fechaLimite, hoy) < 0) vencidas.push(t);
    else porDia.set(t.fechaLimite, [...(porDia.get(t.fechaLimite) ?? []), t]);
  }
  const grupos: Grupo[] = vencidas.length ? [{ clave: 'vencidas', tareas: vencidas }] : [];
  for (const [iso, lista] of [...porDia.entries()].sort()) grupos.push({ clave: iso, tareas: lista });
  return grupos;
}

export interface GrupoPersona { email: string | null; nombre: string; tareas: Tarea[] }

/** Una lista por persona del equipo (en su orden) y, al final, las sin responsable (email null). */
export function agruparPorPersona(tareas: Tarea[], miembros: Pick<Usuario, 'email' | 'nombre'>[]): GrupoPersona[] {
  const ordenadas = ordenarPorPlazo(tareas);
  const grupos: GrupoPersona[] = miembros.map((m) => ({ email: m.email, nombre: m.nombre, tareas: ordenadas.filter((t) => t.asignados.includes(m.email)) }));
  const sinNadie = ordenadas.filter((t) => t.asignados.length === 0);
  if (sinNadie.length) grupos.push({ email: null, nombre: '', tareas: sinNadie });
  return grupos.filter((g) => g.tareas.length > 0);
}

/** Todas las etiquetas en uso, con cuántas tareas tiene cada una, de más a menos. */
export function etiquetasEnUso(tareas: Tarea[]): { etiqueta: string; n: number }[] {
  const m = new Map<string, number>();
  for (const t of tareas) for (const e of t.etiquetas) m.set(e, (m.get(e) ?? 0) + 1);
  return [...m.entries()].map(([etiqueta, n]) => ({ etiqueta, n })).sort((a, b) => b.n - a.n || a.etiqueta.localeCompare(b.etiqueta));
}
