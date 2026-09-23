// ──────────────────────────────────────────────────────────────────────────────
// IMPORTAR PENDIENTES EN MASA
//
// Dos formatos de entrada, los dos pensados para que una IA (o una persona) los
// produzca sin esfuerzo a partir de cualquier lista:
//
//   1. CSV con encabezados: titulo, responsables, fecha_limite, etiquetas,
//      prioridad, etapa, descripcion. Los encabezados se reconocen con
//      variantes en español e inglés y en cualquier orden; sobran o faltan
//      columnas sin problema.
//   2. Una lista de líneas, cada una con la sintaxis de la línea rápida:
//      «@harold revisar /master/insights esta semana #insights». Se aceptan
//      viñetas («- », «* », «1. », «[ ] »).
//
// Puro y probado: recibe texto, devuelve borradores con sus avisos. Nada se
// guarda aquí; eso lo hace la acción de importar tras la vista previa.
// ──────────────────────────────────────────────────────────────────────────────

import { dia } from './fechas';
import { interpretar, leerFecha, resolverMiembro, type MiembroParaParse } from './parseRapido';

export interface Borrador {
  linea: number;
  titulo: string;
  descripcion: string;
  asignados: string[];
  noResueltos: string[];
  etiquetas: string[];
  fechaLimite: string | null;
  prioridad: 'alta' | 'normal';
  /** Nombre de etapa del equipo, ya resuelto; null = la primera. */
  etapa: string | null;
  avisos: string[];
  /** Sin título no se importa. */
  valido: boolean;
}

export interface ResultadoLectura { formato: 'csv' | 'lineas'; borradores: Borrador[] }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const COLUMNAS: Record<string, string[]> = {
  titulo: ['titulo', 'title', 'pendiente', 'tarea', 'task', 'nombre', 'asunto', 'que', 'que hacer'],
  asignados: ['responsables', 'responsable', 'asignados', 'asignado', 'asignado a', 'owner', 'assignee', 'assignees', 'quien', 'para', 'persona', 'encargado'],
  fecha: ['fecha_limite', 'fecha limite', 'fecha', 'vence', 'vencimiento', 'deadline', 'due', 'due date', 'due_date', 'plazo', 'para cuando', 'entrega'],
  etiquetas: ['etiquetas', 'etiqueta', 'tags', 'tag', 'categoria', 'categorias', 'labels', 'label', 'tema', 'area'],
  prioridad: ['prioridad', 'priority', 'urgencia', 'importancia'],
  etapa: ['etapa', 'estado', 'status', 'stage', 'columna', 'state'],
  descripcion: ['descripcion', 'description', 'detalle', 'detalles', 'notas', 'notes', 'comentario', 'comentarios', 'contexto'],
};

/** CSV con comillas, saltos de línea dentro de celdas, y coma, punto y coma o tabulador como separador. */
export function leerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/)[0] ?? '';
  const sep = [',', ';', '\t'].map((s) => ({ s, n: primera.split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const filas: string[][] = []; let fila: string[] = []; let celda = ''; let enComillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++; } else if (c === '"') enComillas = false; else celda += c;
    } else if (c === '"') enComillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else if (c !== '\r') celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.map((f) => f.map((x) => x.trim())).filter((f) => f.some(Boolean));
}

/** ¿La primera línea parece un encabezado de CSV con columnas conocidas? */
export function pareceCsv(texto: string): boolean {
  const [cab] = leerCsv(texto.split(/\r?\n/).slice(0, 1).join('\n'));
  if (!cab || cab.length < 2) return false;
  const conocidas = cab.filter((c) => Object.values(COLUMNAS).some((v) => v.includes(normalizar(c)))).length;
  return conocidas >= 2 || (conocidas >= 1 && cab.some((c) => COLUMNAS.titulo.includes(normalizar(c))));
}

function columnaDe(cabecera: string): string | null {
  const n = normalizar(cabecera);
  for (const [clave, nombres] of Object.entries(COLUMNAS)) if (nombres.includes(n)) return clave;
  return null;
}

/** «2026-10-15», «15/10/2026», «15/10», «15 oct», «esta semana», «el viernes»… */
export function fechaDeCelda(valor: string, hoy: Date): { iso: string | null; aviso?: string } {
  const v = valor.trim();
  if (!v) return { iso: null };
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { iso: iso[0] };
  const dmy = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return { iso: `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` };
  const f = leerFecha(v, hoy);
  return f ? { iso: f.iso } : { iso: null, aviso: `No entendí la fecha «${v}»` };
}

function separar(v: string): string[] {
  return v.split(/[;,|]| y /).map((x) => x.replace(/^[@#]/, '').trim()).filter(Boolean);
}

function resolverEtapa(v: string, etapas: string[]): { etapa: string | null; aviso?: string } {
  const n = normalizar(v);
  if (!n) return { etapa: null };
  const e = etapas.find((x) => normalizar(x) === n) ?? etapas.find((x) => normalizar(x).startsWith(n) || n.startsWith(normalizar(x)));
  return e ? { etapa: e } : { etapa: null, aviso: `La etapa «${v}» no existe; va a la primera` };
}

export function leerLineas(texto: string, miembros: MiembroParaParse[], hoy: Date): Borrador[] {
  return texto.split(/\r?\n/).map((l, i) => ({ l: l.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/, '').trim(), i }))
    .filter(({ l }) => l)
    .map(({ l, i }) => {
      const r = interpretar(l, miembros, hoy);
      const avisos = r.noResueltos.map((n) => `@${n} no es de este equipo`);
      if (!r.titulo) avisos.push('Sin título');
      return { linea: i + 1, titulo: r.titulo, descripcion: '', asignados: r.asignados, noResueltos: r.noResueltos, etiquetas: r.etiquetas, fechaLimite: r.fechaLimite, prioridad: r.prioridad, etapa: null, avisos, valido: !!r.titulo };
    });
}

export function leerTablaCsv(texto: string, miembros: MiembroParaParse[], etapas: string[], hoy: Date): Borrador[] {
  const [cab, ...filas] = leerCsv(texto);
  const mapa = (cab ?? []).map(columnaDe);
  return filas.map((f, i) => {
    const celda = (clave: string) => { const k = mapa.indexOf(clave); return k >= 0 ? (f[k] ?? '') : ''; };
    const avisos: string[] = [];
    const asignados: string[] = []; const noResueltos: string[] = [];
    for (const nombre of separar(celda('asignados'))) {
      const m = resolverMiembro(nombre, miembros);
      if (m) { if (!asignados.includes(m.email)) asignados.push(m.email); } else { noResueltos.push(nombre); avisos.push(`«${nombre}» no es de este equipo`); }
    }
    const fecha = fechaDeCelda(celda('fecha'), hoy);
    if (fecha.aviso) avisos.push(fecha.aviso);
    const et = resolverEtapa(celda('etapa'), etapas);
    if (et.aviso) avisos.push(et.aviso);
    const pri = normalizar(celda('prioridad'));
    const titulo = celda('titulo').replace(/\s+/g, ' ').trim();
    if (!titulo) avisos.push('Sin título');
    return {
      linea: i + 2, titulo, descripcion: celda('descripcion').trim(), asignados, noResueltos,
      etiquetas: [...new Set(separar(celda('etiquetas')).map((x) => x.toLowerCase().replace(/\s+/g, '-')))],
      fechaLimite: fecha.iso, prioridad: /alta|high|urgente|critica|^1$|^!+$/.test(pri) ? 'alta' : 'normal',
      etapa: et.etapa, avisos, valido: !!titulo,
    };
  });
}

/** Detecta el formato y lee. `etapas` son los nombres de etapa del equipo. */
export function leerImportacion(texto: string, miembros: MiembroParaParse[], etapas: string[], hoy: Date = dia()): ResultadoLectura {
  // Si la IA lo devolvió dentro de un bloque de código, se quita la cerca.
  const limpio = texto.replace(/^\s*```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
  if (pareceCsv(limpio)) return { formato: 'csv', borradores: leerTablaCsv(limpio, miembros, etapas, hoy) };
  return { formato: 'lineas', borradores: leerLineas(limpio, miembros, hoy) };
}

/** El encargo que se le pega a la IA junto con el archivo de pendientes. */
export function promptParaIA(equipo: string, miembros: MiembroParaParse[], etapas: string[], hoy: Date = dia()): string {
  const hoyIso = dia(hoy).toISOString().slice(0, 10);
  return [
    `Te adjunto mis pendientes (en cualquier formato). Conviértelos a un CSV para cargarlos en Flujo, el rastreador de pendientes del equipo «${equipo}».`,
    '',
    'Devuélveme SOLO el CSV, dentro de un bloque de código, con exactamente estos encabezados en la primera fila:',
    'titulo,responsables,fecha_limite,etiquetas,prioridad,etapa,descripcion',
    '',
    'Reglas:',
    '- Un pendiente por fila. titulo: corto, en infinitivo («Enviar propuesta a Liverpool»).',
    `- responsables: nombre de pila de quien lo hace, de esta lista del equipo: ${miembros.map((m) => m.nombre).join(', ')}. Varios separados por «;». Vacío si no se sabe.`,
    `- fecha_limite: en formato AAAA-MM-DD. Hoy es ${hoyIso}; si el original dice «esta semana», «el viernes» o «fin de mes», calcula la fecha. Vacío si no hay.`,
    '- etiquetas: palabras cortas en minúsculas separadas por «;», sin #. Vacío si no aplica.',
    '- prioridad: «alta» si es urgente o importante; si no, vacío.',
    `- etapa: una de: ${etapas.join(', ')}. Vacío si no se sabe (queda en ${etapas[0] ?? 'la primera'}).`,
    '- descripcion: contexto útil en una línea (enlaces, con quién, qué falta). Vacío si no hay.',
    '- Si un valor tiene comas o saltos de línea, ponlo entre comillas dobles.',
    '- No inventes pendientes ni fechas: si algo no está en mi lista, déjalo vacío.',
  ].join('\n');
}
