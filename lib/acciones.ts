'use server';

// ──────────────────────────────────────────────────────────────────────────────
// ACCIONES — lo que los formularios y botones llaman. Cada una comprueba quién
// es y si es del equipo antes de tocar nada.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { COOKIE_USUARIO, esProduccion, miembroActual, usuarioActual } from './auth';
import { interpretar } from './parseRapido';
import * as repo from './repositorio';
import type { Prioridad } from './modelo';

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// ── Sesión (sólo fuera de producción) ───────────────────────────────────────

export async function entrar(fd: FormData): Promise<void> {
  if (esProduccion()) redirect('/');
  const email = texto(fd, 'email').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect('/entrar?error=correo');
  (await cookies()).set(COOKIE_USUARIO, email, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 });
  redirect('/');
}

export async function salir(): Promise<void> {
  (await cookies()).delete(COOKIE_USUARIO);
  redirect('/entrar');
}

// ── Equipos ─────────────────────────────────────────────────────────────────

export async function crearEquipoAccion(fd: FormData): Promise<void> {
  const u = await usuarioActual();
  const nombre = texto(fd, 'nombre');
  if (!nombre) redirect('/?error=nombre');
  const correos = texto(fd, 'correos').split(/[\s,;]+/).filter(Boolean);
  const e = repo.crearEquipo(nombre, u.email, correos);
  redirect(`/e/${e.id}`);
}

export async function renombrarEquipoAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.renombrarEquipo(eid, texto(fd, 'nombre'));
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function agregarMiembroAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  for (const c of texto(fd, 'email').split(/[\s,;]+/)) repo.agregarMiembro(eid, c);
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function quitarMiembroAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  const u = await miembroActual(eid);
  const email = texto(fd, 'email');
  if (email !== u.email || repo.miembrosDe(eid).length > 1) repo.quitarMiembro(eid, email);
  revalidatePath(`/e/${eid}`, 'layout');
  if (email === u.email) redirect('/');
}

export async function renombrarmeAccion(fd: FormData): Promise<void> {
  const u = await usuarioActual();
  repo.renombrarUsuario(u.email, texto(fd, 'nombre'));
  revalidatePath('/', 'layout');
}

// ── Etapas ──────────────────────────────────────────────────────────────────

export async function agregarEtapaAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.agregarEtapa(eid, texto(fd, 'nombre'));
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function renombrarEtapaAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.renombrarEtapa(texto(fd, 'etapaId'), texto(fd, 'nombre'));
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function eliminarEtapaAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.eliminarEtapa(texto(fd, 'etapaId'));
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function moverEtapaAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.moverEtapa(texto(fd, 'etapaId'), texto(fd, 'direccion') === '-1' ? -1 : 1);
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function marcarEtapaFinalAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.marcarEtapaFinal(texto(fd, 'etapaId'));
  revalidatePath(`/e/${eid}`, 'layout');
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export interface ResultadoRapido { ok: boolean; error?: string; tareaId?: string }

/** La línea rápida: «@harold revisar /master/insights esta semana». */
export async function crearTareaRapida(equipoId: string, linea: string): Promise<ResultadoRapido> {
  const u = await miembroActual(equipoId);
  const miembros = repo.miembrosDe(equipoId);
  const r = interpretar(linea, miembros);
  if (!r.titulo) return { ok: false, error: 'Falta el título: escribe qué hay que hacer.' };
  const t = repo.crearTarea({
    equipoId, titulo: r.titulo, asignados: r.asignados, etiquetas: r.etiquetas,
    fechaLimite: r.fechaLimite, prioridad: r.prioridad, creadoPor: u.email,
  });
  revalidatePath(`/e/${equipoId}`, 'layout');
  return { ok: true, tareaId: t.id };
}

export interface ResultadoGuardar { ok: boolean; error?: string }

export async function actualizarTareaAccion(fd: FormData): Promise<ResultadoGuardar> {
  const tid = texto(fd, 'tareaId');
  const t = repo.tarea(tid);
  if (!t) return { ok: false, error: 'La tarea ya no existe.' };
  const u = await miembroActual(t.equipoId);
  const titulo = texto(fd, 'titulo');
  if (!titulo) return { ok: false, error: 'El título no puede quedar vacío.' };
  const prioridad = texto(fd, 'prioridad') === 'alta' ? 'alta' : 'normal';
  repo.actualizarTarea(tid, u.email, {
    titulo,
    descripcion: String(fd.get('descripcion') ?? ''),
    fechaLimite: texto(fd, 'fechaLimite') || null,
    prioridad: prioridad as Prioridad,
    etapaId: texto(fd, 'etapaId') || undefined,
    asignados: fd.getAll('asignados').map(String),
    etiquetas: [...new Set(texto(fd, 'etiquetas').split(/[\s,;#]+/).map((x) => x.toLowerCase()).filter(Boolean))],
  });
  revalidatePath(`/e/${t.equipoId}`, 'layout');
  return { ok: true };
}

export async function moverTareaAccion(tareaId: string, etapaId: string): Promise<void> {
  const t = repo.tarea(tareaId);
  if (!t) return;
  const u = await miembroActual(t.equipoId);
  repo.actualizarTarea(tareaId, u.email, { etapaId });
  revalidatePath(`/e/${t.equipoId}`, 'layout');
}

export async function eliminarTareaAccion(fd: FormData): Promise<void> {
  const tid = texto(fd, 'tareaId');
  const t = repo.tarea(tid);
  if (!t) redirect('/');
  await miembroActual(t.equipoId);
  repo.eliminarTarea(tid);
  revalidatePath(`/e/${t.equipoId}`, 'layout');
  redirect(`/e/${t.equipoId}`);
}

export async function eliminarAdjuntoAccion(fd: FormData): Promise<void> {
  const a = repo.adjuntoConRuta(texto(fd, 'adjuntoId'));
  if (!a) return;
  await miembroActual(a.equipoId);
  repo.eliminarAdjunto(a.id);
  revalidatePath(`/e/${a.equipoId}`, 'layout');
}
