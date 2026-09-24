// ──────────────────────────────────────────────────────────────────────────────
// REPOSITORIO — la única puerta a la base de datos.
//
// Cada función recibe y devuelve los objetos de lib/modelo.ts. Las páginas y las
// acciones no saben que debajo hay SQLite.
// ──────────────────────────────────────────────────────────────────────────────

import { randomBytes, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ADJUNTOS_DIR, db } from './db';
import {
  nombreDesdeCorreo,
  type Adjunto, type Comentario, type Enlace, type Equipo, type Etapa, type Evento, type Prioridad, type Tarea, type TipoEvento, type Usuario,
} from './modelo';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ahora = () => Date.now();
const id = () => randomUUID();
const DIAS_SESION = 90;

// ── Usuarios ────────────────────────────────────────────────────────────────

const usuarioDeFila = (r: any): Usuario => ({
  email: r.email,
  nombre: [r.nombre, r.apellido].filter(Boolean).join(' ').trim() || nombreDesdeCorreo(r.email),
  nombrePila: r.nombre,
  apellido: r.apellido ?? '',
  cumpleanos: r.cumpleanos ?? null,
  tieneCuenta: !!r.hash,
});

const invitado = (email: string): Usuario => ({ email, nombre: nombreDesdeCorreo(email), nombrePila: nombreDesdeCorreo(email), apellido: '', cumpleanos: null, tieneCuenta: false });

/** Crea la fila si no existe (alguien lo invitó a un equipo antes de que tuviera cuenta). */
export function asegurarUsuario(email: string): Usuario {
  const e = email.trim().toLowerCase();
  db.prepare('INSERT OR IGNORE INTO usuarios (email, nombre, creado_en) VALUES (?, ?, ?)').run(e, nombreDesdeCorreo(e), ahora());
  return usuarioDeFila(db.prepare('SELECT * FROM usuarios WHERE email = ?').get(e));
}

export function usuario(email: string): Usuario | null {
  const r = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.trim().toLowerCase());
  return r ? usuarioDeFila(r) : null;
}

/** El hash de la contraseña, o null si todavía no creó su cuenta. */
export function hashDe(email: string): string | null {
  return (db.prepare('SELECT hash FROM usuarios WHERE email = ?').get(email.trim().toLowerCase()) as any)?.hash ?? null;
}

export interface NuevaCuenta { email: string; nombre: string; apellido: string; cumpleanos: string | null; hash: string }

/**
 * Crea la cuenta. Si el correo ya estaba (invitado a un equipo), se completa esa
 * fila y conserva sus equipos. Si ya tenía contraseña, no se toca: devuelve false.
 */
export function registrarUsuario(c: NuevaCuenta): boolean {
  const e = c.email.trim().toLowerCase();
  const existente = db.prepare('SELECT hash FROM usuarios WHERE email = ?').get(e) as any;
  if (existente?.hash) return false;
  if (existente) db.prepare('UPDATE usuarios SET nombre = ?, apellido = ?, cumpleanos = ?, hash = ? WHERE email = ?').run(c.nombre.trim(), c.apellido.trim(), c.cumpleanos, c.hash, e);
  else db.prepare('INSERT INTO usuarios (email, nombre, apellido, cumpleanos, hash, creado_en) VALUES (?, ?, ?, ?, ?, ?)').run(e, c.nombre.trim(), c.apellido.trim(), c.cumpleanos, c.hash, ahora());
  return true;
}

export function actualizarPerfil(email: string, p: { nombre: string; apellido: string; cumpleanos: string | null }): void {
  if (!p.nombre.trim()) return;
  db.prepare('UPDATE usuarios SET nombre = ?, apellido = ?, cumpleanos = ? WHERE email = ?').run(p.nombre.trim(), p.apellido.trim(), p.cumpleanos, email);
}

export function cambiarHash(email: string, hash: string): void {
  db.prepare('UPDATE usuarios SET hash = ? WHERE email = ?').run(hash, email);
}

export function usuarios(emails: string[]): Usuario[] {
  if (emails.length === 0) return [];
  const filas = (db.prepare(`SELECT * FROM usuarios WHERE email IN (${emails.map(() => '?').join(',')})`).all(...emails) as any[]).map(usuarioDeFila);
  return emails.map((e) => filas.find((f) => f.email === e) ?? invitado(e));
}

// ── Sesiones ────────────────────────────────────────────────────────────────

/** Abre una sesión y devuelve su token (lo que va en la cookie). */
export function crearSesion(email: string): string {
  const token = randomBytes(32).toString('hex');
  const t = ahora();
  db.prepare('INSERT INTO sesiones (id, email, creado_en, expira_en) VALUES (?, ?, ?, ?)').run(token, email, t, t + DIAS_SESION * 86_400_000);
  db.prepare('DELETE FROM sesiones WHERE expira_en < ?').run(t);
  return token;
}

export function emailDeSesion(token: string): string | null {
  const r = db.prepare('SELECT email, expira_en FROM sesiones WHERE id = ?').get(token) as any;
  if (!r) return null;
  if (r.expira_en < ahora()) { db.prepare('DELETE FROM sesiones WHERE id = ?').run(token); return null; }
  return r.email;
}

export function cerrarSesion(token: string): void {
  db.prepare('DELETE FROM sesiones WHERE id = ?').run(token);
}

// ── Equipos y miembros ──────────────────────────────────────────────────────

const equipoDeFila = (r: any): Equipo => ({ id: r.id, nombre: r.nombre, creadoPor: r.creado_por, creadoEn: r.creado_en, personal: !!r.personal });

/** `etapas`: los nombres iniciales, en orden; la última es la de «hecho». */
export function crearEquipo(nombre: string, creador: string, correos: string[], etapas: string[], personal = false): Equipo {
  const eid = id();
  const t = ahora();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO equipos (id, nombre, creado_por, creado_en, personal) VALUES (?, ?, ?, ?, ?)').run(eid, nombre.trim(), creador, t, personal ? 1 : 0);
    for (const c of new Set([creador, ...correos.map((x) => x.trim().toLowerCase()).filter((x) => x.includes('@'))])) {
      asegurarUsuario(c);
      db.prepare('INSERT OR IGNORE INTO miembros (equipo_id, email, agregado_en) VALUES (?, ?, ?)').run(eid, c, t);
    }
    etapas.forEach((n, i) => {
      db.prepare('INSERT INTO etapas (id, equipo_id, nombre, posicion, es_final) VALUES (?, ?, ?, ?, ?)').run(id(), eid, n, i, i === etapas.length - 1 ? 1 : 0);
    });
  });
  tx();
  return equipo(eid)!;
}

export function equipo(eid: string): Equipo | null {
  const r = db.prepare('SELECT * FROM equipos WHERE id = ?').get(eid);
  return r ? equipoDeFila(r) : null;
}

/** Los equipos de una persona, el personal primero. */
export function equiposDe(email: string): Equipo[] {
  return (db.prepare('SELECT e.* FROM equipos e JOIN miembros m ON m.equipo_id = e.id WHERE m.email = ? ORDER BY e.personal DESC, e.nombre').all(email) as any[]).map(equipoDeFila);
}

/** El espacio personal de alguien: un equipo suyo marcado como personal. */
export function espacioPersonalDe(email: string): Equipo | null {
  const r = db.prepare('SELECT e.* FROM equipos e JOIN miembros m ON m.equipo_id = e.id WHERE m.email = ? AND e.personal = 1 AND e.creado_por = ? ORDER BY e.creado_en LIMIT 1').get(email, email);
  return r ? equipoDeFila(r) : null;
}

export function esMiembro(eid: string, email: string): boolean {
  return !!db.prepare('SELECT 1 FROM miembros WHERE equipo_id = ? AND email = ?').get(eid, email);
}

export function miembrosDe(eid: string): Usuario[] {
  return (db.prepare('SELECT u.* FROM miembros m JOIN usuarios u ON u.email = m.email WHERE m.equipo_id = ? ORDER BY u.nombre, u.apellido').all(eid) as any[]).map(usuarioDeFila);
}

export function agregarMiembro(eid: string, email: string): void {
  const e = email.trim().toLowerCase();
  if (!e.includes('@')) return;
  asegurarUsuario(e);
  db.prepare('INSERT OR IGNORE INTO miembros (equipo_id, email, agregado_en) VALUES (?, ?, ?)').run(eid, e, ahora());
}

export function quitarMiembro(eid: string, email: string): void {
  db.prepare('DELETE FROM miembros WHERE equipo_id = ? AND email = ?').run(eid, email);
}

export function renombrarEquipo(eid: string, nombre: string): void {
  if (nombre.trim()) db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?').run(nombre.trim(), eid);
}

// ── Etapas ──────────────────────────────────────────────────────────────────

const etapaDeFila = (r: any): Etapa => ({ id: r.id, equipoId: r.equipo_id, nombre: r.nombre, posicion: r.posicion, esFinal: !!r.es_final });

export function etapasDe(eid: string): Etapa[] {
  return (db.prepare('SELECT * FROM etapas WHERE equipo_id = ? ORDER BY posicion').all(eid) as any[]).map(etapaDeFila);
}

/** Las etapas de varios equipos a la vez, por id de equipo. */
export function etapasDeEquipos(ids: string[]): Record<string, Etapa[]> {
  const r: Record<string, Etapa[]> = {};
  for (const eid of new Set(ids)) r[eid] = etapasDe(eid);
  return r;
}

export function etapa(etapaId: string): Etapa | null {
  const r = db.prepare('SELECT * FROM etapas WHERE id = ?').get(etapaId);
  return r ? etapaDeFila(r) : null;
}

export function agregarEtapa(eid: string, nombre: string): void {
  if (!nombre.trim()) return;
  const max = (db.prepare('SELECT MAX(posicion) m FROM etapas WHERE equipo_id = ?').get(eid) as any).m ?? -1;
  db.prepare('INSERT INTO etapas (id, equipo_id, nombre, posicion, es_final) VALUES (?, ?, ?, ?, 0)').run(id(), eid, nombre.trim(), max + 1);
}

export function renombrarEtapa(etapaId: string, nombre: string): void {
  if (nombre.trim()) db.prepare('UPDATE etapas SET nombre = ? WHERE id = ?').run(nombre.trim(), etapaId);
}

/** Sólo se borra una etapa vacía. Devuelve si se borró. */
export function eliminarEtapa(etapaId: string): boolean {
  const e = etapa(etapaId);
  if (!e) return false;
  const enUso = db.prepare('SELECT COUNT(*) n FROM tareas WHERE etapa_id = ?').get(etapaId) as any;
  if (enUso.n > 0 || etapasDe(e.equipoId).length <= 1) return false;
  db.prepare('DELETE FROM etapas WHERE id = ?').run(etapaId);
  etapasDe(e.equipoId).forEach((x, i) => db.prepare('UPDATE etapas SET posicion = ? WHERE id = ?').run(i, x.id));
  return true;
}

export function moverEtapa(etapaId: string, direccion: -1 | 1): void {
  const e = etapa(etapaId);
  if (!e) return;
  const lista = etapasDe(e.equipoId);
  const i = lista.findIndex((x) => x.id === etapaId);
  const j = i + direccion;
  if (j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  lista.forEach((x, k) => db.prepare('UPDATE etapas SET posicion = ? WHERE id = ?').run(k, x.id));
}

/** La etapa «hecho» del equipo: sólo una. */
export function marcarEtapaFinal(etapaId: string): void {
  const e = etapa(etapaId);
  if (!e) return;
  db.prepare('UPDATE etapas SET es_final = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE equipo_id = ?').run(etapaId, e.equipoId);
}

// ── Tareas ──────────────────────────────────────────────────────────────────

function tareasDeFilas(filas: any[]): Tarea[] {
  if (filas.length === 0) return [];
  const ids = filas.map((f) => f.id);
  const marcas = ids.map(() => '?').join(',');
  const asig = db.prepare(`SELECT tarea_id, email FROM asignados WHERE tarea_id IN (${marcas})`).all(...ids) as any[];
  const etq = db.prepare(`SELECT tarea_id, etiqueta FROM etiquetas WHERE tarea_id IN (${marcas}) ORDER BY etiqueta`).all(...ids) as any[];
  const enl = db.prepare(`SELECT tarea_id, url, nombre FROM enlaces WHERE tarea_id IN (${marcas}) ORDER BY posicion`).all(...ids) as any[];
  const com = db.prepare(`SELECT tarea_id, COUNT(*) n FROM comentarios WHERE tarea_id IN (${marcas}) GROUP BY tarea_id`).all(...ids) as any[];
  const adj = db.prepare(`SELECT tarea_id, COUNT(*) n FROM adjuntos WHERE tarea_id IN (${marcas}) GROUP BY tarea_id`).all(...ids) as any[];
  return filas.map((r) => ({
    id: r.id, equipoId: r.equipo_id, titulo: r.titulo, descripcion: r.descripcion, etapaId: r.etapa_id,
    fechaLimite: r.fecha_limite, prioridad: r.prioridad as Prioridad, creadoPor: r.creado_por,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en, terminadoEn: r.terminado_en,
    asignados: asig.filter((a) => a.tarea_id === r.id).map((a) => a.email),
    etiquetas: etq.filter((a) => a.tarea_id === r.id).map((a) => a.etiqueta),
    enlaces: enl.filter((a) => a.tarea_id === r.id).map((a) => ({ url: a.url, nombre: a.nombre ?? '' })),
    comentarios: com.find((c) => c.tarea_id === r.id)?.n ?? 0,
    adjuntos: adj.find((c) => c.tarea_id === r.id)?.n ?? 0,
  }));
}

const ORDEN = 'ORDER BY (fecha_limite IS NULL), fecha_limite, creado_en DESC';

export function tareasDe(eid: string): Tarea[] {
  return tareasDeFilas(db.prepare(`SELECT * FROM tareas WHERE equipo_id = ? ${ORDEN}`).all(eid) as any[]);
}

/**
 * Lo abierto de una persona en todos sus equipos: lo que tiene asignado y, en su
 * espacio personal, todo (ahí no hace falta asignarse nada).
 */
export function tareasAbiertasDe(email: string): Tarea[] {
  return tareasDeFilas(db.prepare(`
    SELECT t.* FROM tareas t
    JOIN etapas e ON e.id = t.etapa_id
    JOIN equipos q ON q.id = t.equipo_id
    JOIN miembros m ON m.equipo_id = t.equipo_id AND m.email = ?
    WHERE e.es_final = 0 AND (
      (q.personal = 1 AND q.creado_por = ?) OR EXISTS (SELECT 1 FROM asignados a WHERE a.tarea_id = t.id AND a.email = ?)
    )
    ${ORDEN}`).all(email, email, email) as any[]);
}

export function tarea(tid: string): Tarea | null {
  const r = db.prepare('SELECT * FROM tareas WHERE id = ?').get(tid);
  return r ? tareasDeFilas([r])[0] : null;
}

function registrarEvento(tareaId: string, autor: string, tipo: TipoEvento, detalle: Record<string, unknown> = {}): void {
  db.prepare('INSERT INTO eventos (id, tarea_id, autor, tipo, detalle, creado_en) VALUES (?, ?, ?, ?, ?, ?)').run(id(), tareaId, autor, tipo, JSON.stringify(detalle), ahora());
}

function guardarEnlaces(tid: string, enlaces: Enlace[]): void {
  db.prepare('DELETE FROM enlaces WHERE tarea_id = ?').run(tid);
  const vistos = new Set<string>();
  let i = 0;
  for (const e of enlaces) {
    const url = e.url.trim();
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    db.prepare('INSERT INTO enlaces (tarea_id, url, nombre, posicion) VALUES (?, ?, ?, ?)').run(tid, url, e.nombre.trim(), i++);
  }
}

const mismosEnlaces = (a: Enlace[], b: Enlace[]) => a.length === b.length && a.every((x, i) => x.url === b[i]?.url && x.nombre === b[i]?.nombre);

export interface NuevaTarea {
  equipoId: string; titulo: string; descripcion?: string; asignados: string[]; etiquetas: string[]; enlaces?: Enlace[];
  fechaLimite: string | null; prioridad: Prioridad; creadoPor: string;
  /** Etapa inicial; sin ella, la primera que no sea «hecho». */
  etapaId?: string;
}

export function crearTarea(n: NuevaTarea): Tarea {
  const tid = id();
  const t = ahora();
  const etapas = etapasDe(n.equipoId);
  const etapaInicial = etapas.find((e) => e.id === n.etapaId) ?? etapas.find((e) => !e.esFinal) ?? etapas[0];
  if (!etapaInicial) throw new Error('El equipo no tiene etapas');
  db.transaction(() => {
    db.prepare('INSERT INTO tareas (id, equipo_id, titulo, descripcion, etapa_id, fecha_limite, prioridad, creado_por, creado_en, actualizado_en, terminado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(tid, n.equipoId, n.titulo.trim(), (n.descripcion ?? '').trim(), etapaInicial.id, n.fechaLimite, n.prioridad, n.creadoPor, t, t, etapaInicial.esFinal ? t : null);
    for (const a of new Set(n.asignados)) db.prepare('INSERT INTO asignados (tarea_id, email) VALUES (?, ?)').run(tid, a);
    for (const e of new Set(n.etiquetas)) db.prepare('INSERT INTO etiquetas (tarea_id, etiqueta) VALUES (?, ?)').run(tid, e);
    if (n.enlaces?.length) guardarEnlaces(tid, n.enlaces);
    registrarEvento(tid, n.creadoPor, 'creada', { asignados: n.asignados, fechaLimite: n.fechaLimite });
  })();
  return tarea(tid)!;
}

export interface CambiosTarea {
  titulo?: string; descripcion?: string; fechaLimite?: string | null; prioridad?: Prioridad;
  etapaId?: string; asignados?: string[]; etiquetas?: string[]; enlaces?: Enlace[];
}

/** Aplica sólo lo que cambió y deja un evento por cada cambio. */
export function actualizarTarea(tid: string, autor: string, c: CambiosTarea): Tarea | null {
  const antes = tarea(tid);
  if (!antes) return null;
  const t = ahora();
  const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  db.transaction(() => {
    if (c.titulo !== undefined && c.titulo.trim() && c.titulo.trim() !== antes.titulo) {
      db.prepare('UPDATE tareas SET titulo = ? WHERE id = ?').run(c.titulo.trim(), tid);
      registrarEvento(tid, autor, 'titulo', { de: antes.titulo, a: c.titulo.trim() });
    }
    if (c.descripcion !== undefined && c.descripcion.trim() !== antes.descripcion) {
      db.prepare('UPDATE tareas SET descripcion = ? WHERE id = ?').run(c.descripcion.trim(), tid);
      registrarEvento(tid, autor, 'descripcion');
    }
    if (c.fechaLimite !== undefined && c.fechaLimite !== antes.fechaLimite) {
      db.prepare('UPDATE tareas SET fecha_limite = ? WHERE id = ?').run(c.fechaLimite, tid);
      registrarEvento(tid, autor, 'fecha', { de: antes.fechaLimite, a: c.fechaLimite });
    }
    if (c.prioridad !== undefined && c.prioridad !== antes.prioridad) {
      db.prepare('UPDATE tareas SET prioridad = ? WHERE id = ?').run(c.prioridad, tid);
      registrarEvento(tid, autor, 'prioridad', { de: antes.prioridad, a: c.prioridad });
    }
    if (c.etapaId !== undefined && c.etapaId !== antes.etapaId) {
      const nueva = etapa(c.etapaId);
      if (nueva && nueva.equipoId === antes.equipoId) {
        db.prepare('UPDATE tareas SET etapa_id = ?, terminado_en = ? WHERE id = ?').run(nueva.id, nueva.esFinal ? t : null, tid);
        registrarEvento(tid, autor, 'etapa', { de: etapa(antes.etapaId)?.nombre ?? '', a: nueva.nombre });
      }
    }
    if (c.asignados !== undefined && !mismos(c.asignados, antes.asignados)) {
      db.prepare('DELETE FROM asignados WHERE tarea_id = ?').run(tid);
      for (const a of new Set(c.asignados)) db.prepare('INSERT INTO asignados (tarea_id, email) VALUES (?, ?)').run(tid, a);
      registrarEvento(tid, autor, 'asignados', { de: antes.asignados, a: c.asignados });
    }
    if (c.etiquetas !== undefined && !mismos(c.etiquetas, antes.etiquetas)) {
      db.prepare('DELETE FROM etiquetas WHERE tarea_id = ?').run(tid);
      for (const e of new Set(c.etiquetas)) db.prepare('INSERT INTO etiquetas (tarea_id, etiqueta) VALUES (?, ?)').run(tid, e);
      registrarEvento(tid, autor, 'etiquetas', { de: antes.etiquetas, a: c.etiquetas });
    }
    if (c.enlaces !== undefined && !mismosEnlaces(c.enlaces, antes.enlaces)) {
      guardarEnlaces(tid, c.enlaces);
      registrarEvento(tid, autor, 'enlaces', { de: antes.enlaces, a: c.enlaces });
    }
    db.prepare('UPDATE tareas SET actualizado_en = ? WHERE id = ?').run(t, tid);
  })();
  return tarea(tid);
}

export function eliminarTarea(tid: string): void {
  const archivos = db.prepare('SELECT ruta FROM adjuntos WHERE tarea_id = ?').all(tid) as any[];
  db.prepare('DELETE FROM tareas WHERE id = ?').run(tid);
  for (const a of archivos) fs.rmSync(path.join(ADJUNTOS_DIR, a.ruta), { force: true });
}

// ── Comentarios, adjuntos, historial ────────────────────────────────────────

const adjuntoDeFila = (r: any): Adjunto => ({ id: r.id, tareaId: r.tarea_id, comentarioId: r.comentario_id, nombre: r.nombre, mime: r.mime, tamano: r.tamano, subidoPor: r.subido_por, creadoEn: r.creado_en });

export function comentar(tareaId: string, autor: string, texto: string): Comentario {
  const cid = id();
  const t = ahora();
  db.prepare('INSERT INTO comentarios (id, tarea_id, autor, texto, creado_en) VALUES (?, ?, ?, ?, ?)').run(cid, tareaId, autor, texto.trim(), t);
  db.prepare('UPDATE tareas SET actualizado_en = ? WHERE id = ?').run(t, tareaId);
  registrarEvento(tareaId, autor, 'comentario', { comentarioId: cid });
  return { id: cid, tareaId, autor, texto: texto.trim(), creadoEn: t, adjuntos: [] };
}

export function guardarAdjunto(a: { tareaId: string; comentarioId: string | null; nombre: string; mime: string; contenido: Buffer; subidoPor: string }): Adjunto {
  const aid = id();
  const ext = (a.nombre.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? '').toLowerCase();
  const ruta = `${aid}${ext}`;
  fs.writeFileSync(path.join(ADJUNTOS_DIR, ruta), a.contenido);
  const t = ahora();
  db.prepare('INSERT INTO adjuntos (id, tarea_id, comentario_id, nombre, mime, tamano, ruta, subido_por, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(aid, a.tareaId, a.comentarioId, a.nombre, a.mime, a.contenido.length, ruta, a.subidoPor, t);
  db.prepare('UPDATE tareas SET actualizado_en = ? WHERE id = ?').run(t, a.tareaId);
  if (!a.comentarioId) registrarEvento(a.tareaId, a.subidoPor, 'adjunto', { nombre: a.nombre });
  return adjuntoDeFila({ id: aid, tarea_id: a.tareaId, comentario_id: a.comentarioId, nombre: a.nombre, mime: a.mime, tamano: a.contenido.length, subido_por: a.subidoPor, creado_en: t });
}

/** Un adjunto con su ruta en disco y el equipo dueño, para servirlo con permiso. */
export function adjuntoConRuta(aid: string): (Adjunto & { rutaCompleta: string; equipoId: string }) | null {
  const r = db.prepare('SELECT a.*, t.equipo_id FROM adjuntos a JOIN tareas t ON t.id = a.tarea_id WHERE a.id = ?').get(aid) as any;
  return r ? { ...adjuntoDeFila(r), rutaCompleta: path.join(ADJUNTOS_DIR, r.ruta), equipoId: r.equipo_id } : null;
}

export function eliminarAdjunto(aid: string): void {
  const a = adjuntoConRuta(aid);
  if (!a) return;
  db.prepare('DELETE FROM adjuntos WHERE id = ?').run(aid);
  fs.rmSync(a.rutaCompleta, { force: true });
}

export function comentariosDe(tareaId: string): Comentario[] {
  const filas = db.prepare('SELECT * FROM comentarios WHERE tarea_id = ? ORDER BY creado_en').all(tareaId) as any[];
  const adj = (db.prepare('SELECT * FROM adjuntos WHERE tarea_id = ? AND comentario_id IS NOT NULL ORDER BY creado_en').all(tareaId) as any[]).map(adjuntoDeFila);
  return filas.map((r) => ({ id: r.id, tareaId: r.tarea_id, autor: r.autor, texto: r.texto, creadoEn: r.creado_en, adjuntos: adj.filter((a) => a.comentarioId === r.id) }));
}

/** Imágenes pegadas directo a la tarea, sin comentario. */
export function adjuntosSueltos(tareaId: string): Adjunto[] {
  return (db.prepare('SELECT * FROM adjuntos WHERE tarea_id = ? AND comentario_id IS NULL ORDER BY creado_en').all(tareaId) as any[]).map(adjuntoDeFila);
}

export function eventosDe(tareaId: string): Evento[] {
  return (db.prepare('SELECT * FROM eventos WHERE tarea_id = ? ORDER BY creado_en DESC').all(tareaId) as any[])
    .map((r) => ({ id: r.id, tareaId: r.tarea_id, autor: r.autor, tipo: r.tipo, detalle: JSON.parse(r.detalle || '{}'), creadoEn: r.creado_en }));
}
