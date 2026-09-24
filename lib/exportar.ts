// ──────────────────────────────────────────────────────────────────────────────
// EXPORTAR LOS PENDIENTES DE UN EQUIPO
//
// Tres textos a partir de los mismos datos, para que cada quien los lleve a
// donde le sirva:
//   - Markdown: para pegarlo tal cual en una IA o en un documento.
//   - JSON: todo, con comentarios y enlaces, para scripts o análisis a fondo.
//   - CSV: para hojas de cálculo; sus encabezados son los que la importación
//     entiende, así que un CSV exportado se puede volver a importar.
// (El Excel lo arma la ruta con ExcelJS a partir de las mismas filas.)
//
// Puro: recibe datos y rótulos ya traducidos, devuelve texto. Sin SQL ni Next.
// ──────────────────────────────────────────────────────────────────────────────

import type { Comentario, Equipo, Etapa, Tarea, Usuario } from './modelo';

export interface DatosExportacion {
  equipo: Equipo;
  etapas: Etapa[];
  miembros: Usuario[];
  tareas: Tarea[];
  comentarios: Record<string, Comentario[]>;
  /** Zona horaria en la que se escriben las fechas con hora. */
  zona: string;
  ahora: Date;
}

/** Los textos que dependen del idioma de quien exporta. */
export interface Rotulos {
  titulo: string;          // «Pendientes de {equipo}»
  exportado: string;       // «Exportado el»
  etapas: string;
  miembros: string;
  hecho: string;           // marca de la etapa final
  sinResponsable: string;
  responsables: string;
  correos: string;
  vence: string;
  prioridad: string;
  alta: string;
  normal: string;
  etiquetas: string;
  descripcion: string;
  enlaces: string;
  creadoPor: string;
  creadoEn: string;
  terminadoEn: string;
  comentarios: string;
  estado: string;
  abierto: string;
  id: string;
}

/**
 * Los textos de las instrucciones para la IA, con sus huecos: {yo}, {hoy},
 * {equipo}, {etapas}, {final}, {temas}. Se rellenan en `instruccionesIA`.
 */
export interface RotulosIA {
  titulo: string;
  contexto: string;
  contextoPersonal: string;
  pide: string;
  puntos: string[];
  etapas: string;
  cierre: string;
}

/** Lo que rellena los huecos de las instrucciones (también se le pasa a next-intl, que los exige al traducir). */
export function valoresIA(d: DatosExportacion, yo: { nombre: string; email: string }): Record<string, string> {
  const temas = [...new Set(d.tareas.flatMap((t) => t.etiquetas))].sort().map((x) => '#' + x).join(' ');
  return {
    yo: `${yo.nombre} <${yo.email}>`, hoy: fechaHora(d.ahora.getTime(), d.zona).slice(0, 10), equipo: d.equipo.nombre,
    etapas: d.etapas.map((e) => e.nombre).join(' → '), final: d.etapas.find((e) => e.esFinal)?.nombre ?? '', temas: temas || '—',
  };
}

/**
 * El bloque que va arriba del Markdown para que, al pegarlo en un chat, la IA
 * sepa qué hacer con los pendientes en vez de devolverlos como tabla.
 */
export function instruccionesIA(d: DatosExportacion, r: RotulosIA, yo: { nombre: string; email: string }): string[] {
  const v = valoresIA(d, yo);
  const f = (s: string) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
  const L = [`> **${r.titulo}**`, '>', `> ${f(d.equipo.personal ? r.contextoPersonal : r.contexto)}`, `> ${f(r.pide)}`, '>'];
  r.puntos.forEach((p, i) => L.push(`> ${i + 1}. ${f(p)}`));
  L.push('>', `> ${f(r.etapas)}`, `> ${f(r.cierre)}`);
  return L;
}

export const COLUMNAS_CSV = ['titulo', 'etapa', 'responsables', 'fecha_limite', 'prioridad', 'etiquetas', 'descripcion', 'enlaces', 'creado_por', 'creado_en', 'terminado_en', 'comentarios', 'id'] as const;

/** «2026-09-24 10:15» en la zona dada; vacío si no hay fecha. */
export function fechaHora(ms: number | null | undefined, zona: string): string {
  if (!ms) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

const escaparCsv = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Un renglón plano por pendiente: lo que va al CSV y al Excel. */
export function filasPlanas(d: DatosExportacion, r: Rotulos): Record<(typeof COLUMNAS_CSV)[number], string>[] {
  const etapa = new Map(d.etapas.map((e) => [e.id, e.nombre]));
  const nombre = new Map(d.miembros.map((m) => [m.email, m.nombre]));
  return d.tareas.map((t) => ({
    titulo: t.titulo,
    etapa: etapa.get(t.etapaId) ?? '',
    responsables: t.asignados.map((a) => nombre.get(a) ?? a).join('; '),
    fecha_limite: t.fechaLimite ?? '',
    prioridad: t.prioridad === 'alta' ? r.alta : '',
    etiquetas: t.etiquetas.join('; '),
    descripcion: t.descripcion,
    enlaces: t.enlaces.map((e) => (e.nombre ? `${e.nombre}: ${e.url}` : e.url)).join('; '),
    creado_por: nombre.get(t.creadoPor) ?? t.creadoPor,
    creado_en: fechaHora(t.creadoEn, d.zona),
    terminado_en: fechaHora(t.terminadoEn, d.zona),
    comentarios: (d.comentarios[t.id] ?? []).map((c) => `[${fechaHora(c.creadoEn, d.zona)} ${nombre.get(c.autor) ?? c.autor}] ${c.texto}`).join('\n'),
    id: t.id,
  }));
}

export function aCsv(d: DatosExportacion, r: Rotulos): string {
  const filas = filasPlanas(d, r);
  const lineas = [COLUMNAS_CSV.join(','), ...filas.map((f) => COLUMNAS_CSV.map((c) => escaparCsv(f[c])).join(','))];
  return '﻿' + lineas.join('\r\n') + '\r\n'; // el BOM es para que Excel lea bien las tildes
}

export function aJson(d: DatosExportacion): string {
  const nombre = new Map(d.miembros.map((m) => [m.email, m.nombre]));
  const persona = (email: string) => ({ nombre: nombre.get(email) ?? email, email });
  const etapa = new Map(d.etapas.map((e) => [e.id, e]));
  return JSON.stringify({
    equipo: d.equipo.nombre,
    exportadoEn: fechaHora(d.ahora.getTime(), d.zona),
    zonaHoraria: d.zona,
    etapas: d.etapas.map((e) => ({ nombre: e.nombre, esFinal: e.esFinal })),
    miembros: d.miembros.map((m) => persona(m.email)),
    pendientes: d.tareas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      descripcion: t.descripcion,
      etapa: etapa.get(t.etapaId)?.nombre ?? null,
      hecho: !!etapa.get(t.etapaId)?.esFinal,
      responsables: t.asignados.map(persona),
      fechaLimite: t.fechaLimite,
      prioridad: t.prioridad,
      etiquetas: t.etiquetas,
      enlaces: t.enlaces,
      creadoPor: persona(t.creadoPor),
      creadoEn: fechaHora(t.creadoEn, d.zona),
      actualizadoEn: fechaHora(t.actualizadoEn, d.zona),
      terminadoEn: fechaHora(t.terminadoEn, d.zona) || null,
      adjuntos: t.adjuntos,
      comentarios: (d.comentarios[t.id] ?? []).map((c) => ({ autor: persona(c.autor), texto: c.texto, fecha: fechaHora(c.creadoEn, d.zona), adjuntos: c.adjuntos.map((a) => a.nombre) })),
    })),
  }, null, 2) + '\n';
}

export function aMarkdown(d: DatosExportacion, r: Rotulos, instrucciones: string[] = []): string {
  const nombre = new Map(d.miembros.map((m) => [m.email, m.nombre]));
  const quien = (email: string) => nombre.get(email) ?? email;
  const L: string[] = [];
  if (instrucciones.length) L.push(...instrucciones, '');
  L.push(`# ${r.titulo.replace('{equipo}', d.equipo.nombre)}`);
  L.push('');
  L.push(`${r.exportado} ${fechaHora(d.ahora.getTime(), d.zona)} (${d.zona}).`);
  L.push(`${r.etapas}: ${d.etapas.map((e) => (e.esFinal ? `${e.nombre} (${r.hecho})` : e.nombre)).join(' → ')}.`);
  L.push(`${r.miembros}: ${d.miembros.map((m) => `${m.nombre} <${m.email}>`).join(', ')}.`);
  for (const e of d.etapas) {
    const tareas = d.tareas.filter((t) => t.etapaId === e.id);
    L.push('', `## ${e.nombre} (${tareas.length})`);
    for (const t of tareas) {
      L.push('', `### ${t.prioridad === 'alta' ? '⚑ ' : ''}${t.titulo}`);
      L.push(`- ${r.responsables}: ${t.asignados.length ? t.asignados.map(quien).join(', ') : r.sinResponsable}`);
      if (t.fechaLimite) L.push(`- ${r.vence}: ${t.fechaLimite}`);
      L.push(`- ${r.prioridad}: ${t.prioridad === 'alta' ? r.alta : r.normal}`);
      if (t.etiquetas.length) L.push(`- ${r.etiquetas}: ${t.etiquetas.map((x) => '#' + x).join(' ')}`);
      if (t.enlaces.length) L.push(`- ${r.enlaces}: ${t.enlaces.map((x) => (x.nombre ? `[${x.nombre}](${x.url})` : x.url)).join(', ')}`);
      L.push(`- ${r.creadoPor}: ${quien(t.creadoPor)}, ${fechaHora(t.creadoEn, d.zona)}`);
      if (t.terminadoEn) L.push(`- ${r.terminadoEn}: ${fechaHora(t.terminadoEn, d.zona)}`);
      if (t.descripcion.trim()) L.push('', t.descripcion.trim());
      const cs = d.comentarios[t.id] ?? [];
      if (cs.length) {
        L.push('', `**${r.comentarios}:**`);
        for (const c of cs) L.push(`- ${fechaHora(c.creadoEn, d.zona)} · ${quien(c.autor)}: ${c.texto.trim().replace(/\r?\n/g, ' ')}`);
      }
    }
  }
  return L.join('\n') + '\n';
}

/** «flujo-equipo-comercial-2026-09-24» */
export function nombreArchivo(equipo: string, ahora: Date, zona: string): string {
  const slug = equipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'equipo';
  return `flujo-${slug}-${fechaHora(ahora.getTime(), zona).slice(0, 10)}`;
}
