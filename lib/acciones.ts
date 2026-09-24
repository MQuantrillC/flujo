'use server';

// ──────────────────────────────────────────────────────────────────────────────
// ACCIONES — lo que los formularios y botones llaman. Cada una comprueba quién
// es y si es del equipo antes de tocar nada.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { COOKIE_SESION, DURACION_SESION, esProduccion, miembroActual, tokenActual, usuarioActual } from './auth';
import { cifrar, coincide, LARGO_MINIMO } from './contrasenas';
import { completarEnlace, extraerEnlaces } from './enlaces';
import { hoyActual } from './hoy';
import { interpretar } from './parseRapido';
import { ajustarBorradores, leerImportacion, type AjustesImportacion, type Borrador } from './importar';
import { esFiltro, esModo, seleccionar, type Modo } from './copiar';
import { idiomaValido } from './idioma';
import { correoConfigurado, enviarCorreo } from './correo';
import { correoInvitacion, enlaceInvitacion } from './invitaciones';
import * as repo from './repositorio';
import { CORREO_VALIDO, etapasIniciales, type Prioridad } from './modelo';

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Direcciones sueltas → enlaces sin nombre. */
const sinNombre = (urls: string[]) => urls.map((url) => ({ url, nombre: '' }));

/** `error` es una clave de messages/*.json que la pantalla traduce. */
export interface Resultado { ok: boolean; error?: string }

// ── Cuentas y sesión ────────────────────────────────────────────────────────

async function abrirSesion(email: string): Promise<void> {
  const token = repo.crearSesion(email);
  // En producción la cookie sólo viaja por HTTPS, salvo que FLUJO_SIN_HTTPS=1 (una máquina a la que se entra por IP).
  const segura = esProduccion() && process.env.FLUJO_SIN_HTTPS !== '1';
  (await cookies()).set(COOKIE_SESION, token, { httpOnly: true, sameSite: 'lax', secure: segura, path: '/', maxAge: DURACION_SESION });
}

export async function entrar(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const email = texto(fd, 'email').toLowerCase();
  const contrasena = String(fd.get('contrasena') ?? '');
  if (!CORREO_VALIDO.test(email) || !coincide(contrasena, repo.hashDe(email))) return { ok: false, error: 'credenciales' };
  await abrirSesion(email);
  redirect('/');
}

export async function registrar(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const email = texto(fd, 'email').toLowerCase();
  const nombre = texto(fd, 'nombre');
  const apellido = texto(fd, 'apellido');
  const cumpleanos = texto(fd, 'cumpleanos');
  const contrasena = String(fd.get('contrasena') ?? '');
  const repetir = String(fd.get('repetir') ?? '');
  if (!nombre || !apellido) return { ok: false, error: 'faltanDatos' };
  if (!CORREO_VALIDO.test(email)) return { ok: false, error: 'correoInvalido' };
  if (cumpleanos && !FECHA.test(cumpleanos)) return { ok: false, error: 'faltanDatos' };
  if (contrasena.length < LARGO_MINIMO) return { ok: false, error: 'contrasenaCorta' };
  if (contrasena !== repetir) return { ok: false, error: 'noCoinciden' };
  if (!repo.registrarUsuario({ email, nombre, apellido, cumpleanos: cumpleanos || null, hash: cifrar(contrasena) })) return { ok: false, error: 'yaExiste' };
  await abrirSesion(email);
  redirect('/');
}

export async function salir(): Promise<void> {
  const token = await tokenActual();
  if (token) repo.cerrarSesion(token);
  (await cookies()).delete(COOKIE_SESION);
  redirect('/entrar');
}

export async function actualizarPerfilAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await usuarioActual();
  const nombre = texto(fd, 'nombre');
  const cumpleanos = texto(fd, 'cumpleanos');
  if (!nombre || (cumpleanos && !FECHA.test(cumpleanos))) return { ok: false, error: 'faltanDatos' };
  repo.actualizarPerfil(u.email, { nombre, apellido: texto(fd, 'apellido'), cumpleanos: cumpleanos || null });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function cambiarContrasenaAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await usuarioActual();
  const actual = String(fd.get('actual') ?? '');
  const nueva = String(fd.get('nueva') ?? '');
  if (!coincide(actual, repo.hashDe(u.email))) return { ok: false, error: 'actualIncorrecta' };
  if (nueva.length < LARGO_MINIMO) return { ok: false, error: 'contrasenaCorta' };
  if (nueva !== String(fd.get('repetir') ?? '')) return { ok: false, error: 'noCoinciden' };
  repo.cambiarHash(u.email, cifrar(nueva));
  return { ok: true };
}

// ── Equipos ─────────────────────────────────────────────────────────────────

export async function crearEquipoAccion(fd: FormData): Promise<void> {
  const u = await usuarioActual();
  const nombre = texto(fd, 'nombre');
  if (!nombre) redirect('/?error=nombre');
  // Un campo por correo (las filas del formulario), pero también vale pegar varios en uno.
  const correos = fd.getAll('correos').flatMap((c) => String(c).split(/[\s,;]+/)).map((c) => c.trim().toLowerCase()).filter(Boolean);
  const e = repo.crearEquipo(nombre, u.email, correos, etapasIniciales(idiomaValido(await getLocale())));
  await avisarInvitados(e.id, correos.filter((c) => c !== u.email), u.nombre);
  redirect(`/e/${e.id}`);
}

/** La dirección pública de la app, para los enlaces de los correos: FLUJO_URL o la de esta petición. */
async function urlBase(): Promise<string> {
  const fija = process.env.FLUJO_URL?.trim();
  if (fija) return fija.replace(/\/+$/, '');
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? (esProduccion() && process.env.FLUJO_SIN_HTTPS !== '1' ? 'https' : 'http');
  return `${proto}://${h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3100'}`;
}

/**
 * Manda el correo de invitación a cada correo nuevo del equipo, en el idioma de
 * quien invita. Sin RESEND_API_KEY no hace nada: la pantalla de Ajustes ofrece
 * el enlace para copiar. Nunca rompe la acción que lo llama.
 */
async function avisarInvitados(eid: string, correos: string[], quien: string): Promise<void> {
  if (!correoConfigurado() || correos.length === 0) return;
  const e = repo.equipo(eid);
  if (!e) return;
  const base = await urlBase();
  const t = await getTranslations('correo.invitacion');
  await Promise.allSettled(correos.map(async (email) => {
    const invitado = { email, equipoId: eid, equipoNombre: e.nombre, tieneCuenta: !!repo.usuario(email)?.tieneCuenta };
    const v = { quien, equipo: e.nombre, email };
    const rotulos = { asunto: t('asunto', v), titulo: t('titulo', v), cuerpo: t('cuerpo', v), crearCuenta: t('crearCuenta', v), entrar: t('entrar'), boton: t('boton'), oEnlace: t('oEnlace'), pie: t('pie'), firma: t('firma') };
    await enviarCorreo(email, correoInvitacion(rotulos, invitado, enlaceInvitacion(base, invitado), `${base}/apple-icon.png`));
  }));
}

/** El espacio personal: un equipo de una sola persona, para los pendientes propios. */
export async function crearEspacioPersonalAccion(): Promise<void> {
  const u = await usuarioActual();
  const existente = repo.espacioPersonalDe(u.email);
  if (existente) redirect(`/e/${existente.id}`);
  const t = await getTranslations('inicio');
  const e = repo.crearEquipo(t('nombreEspacioPersonal'), u.email, [], etapasIniciales(idiomaValido(await getLocale())), true);
  redirect(`/e/${e.id}`);
}

export async function renombrarEquipoAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.renombrarEquipo(eid, texto(fd, 'nombre'));
  revalidatePath(`/e/${eid}`, 'layout');
}

export async function eliminarEquipoAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  const u = await miembroActual(eid);
  const e = repo.equipo(eid)!;
  if (!repo.puedeEliminarEquipo(eid, u.email)) redirect(`/e/${eid}/ajustes`);
  if (texto(fd, 'confirmacion').toLowerCase() !== e.nombre.trim().toLowerCase()) redirect(`/e/${eid}/ajustes`);
  repo.eliminarEquipo(eid);
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function agregarMiembroAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  const u = await miembroActual(eid);
  const nuevos = texto(fd, 'email').toLowerCase().split(/[\s,;]+/).filter((c) => repo.agregarMiembro(eid, c));
  await avisarInvitados(eid, nuevos, u.nombre);
  revalidatePath(`/e/${eid}`, 'layout');
}

// ── Pasar pendientes a otro equipo ──────────────────────────────────────────

export type ResultadoPase = { ok: true; n: number; destino: string; modo: Modo } | { ok: false; error: 'destino' | 'nada' } | null;

/** Copia o mueve al otro equipo los pendientes que cumplen el filtro; el filtro se vuelve a aplicar aquí. */
export async function pasarPendientesAccion(_p: ResultadoPase, fd: FormData): Promise<ResultadoPase> {
  const origen = texto(fd, 'equipoId');
  const u = await miembroActual(origen);
  const destino = texto(fd, 'destino');
  const d = repo.equipo(destino);
  if (!d || destino === origen || !repo.esMiembro(destino, u.email)) return { ok: false, error: 'destino' };
  const filtro = texto(fd, 'filtro'); const modo = texto(fd, 'modo');
  if (!esFiltro(filtro) || !esModo(modo)) return { ok: false, error: 'nada' };
  const finales = new Set(repo.etapasDe(origen).filter((e) => e.esFinal).map((e) => e.id));
  const ids = seleccionar(repo.tareasDe(origen), finales, filtro, texto(fd, 'etiqueta'), u.email).map((t) => t.id);
  if (ids.length === 0) return { ok: false, error: 'nada' };
  const n = repo.pasarTareas(ids, origen, destino, u.email, modo === 'mover');
  revalidatePath(`/e/${origen}`, 'layout');
  revalidatePath(`/e/${destino}`, 'layout');
  revalidatePath('/');
  return { ok: true, n, destino: d.nombre, modo };
}

/** Desde la ficha de un pendiente: copiarlo (vinculado) o moverlo a otro de mis equipos. */
export async function pasarTareaAccion(fd: FormData): Promise<void> {
  const tid = texto(fd, 'tareaId');
  const t = repo.tarea(tid);
  if (!t) redirect('/');
  const u = await miembroActual(t.equipoId);
  const destino = texto(fd, 'destino');
  const mover = texto(fd, 'modo') === 'mover';
  if (destino === t.equipoId || !repo.esMiembro(destino, u.email)) return;
  const n = repo.pasarTareas([tid], t.equipoId, destino, u.email, mover);
  revalidatePath(`/e/${t.equipoId}`, 'layout');
  revalidatePath(`/e/${destino}`, 'layout');
  revalidatePath('/');
  if (mover && n > 0) redirect(`/e/${destino}/t/${tid}`);
}

export async function quitarMiembroAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  const u = await miembroActual(eid);
  const email = texto(fd, 'email');
  if (email !== u.email || repo.miembrosDe(eid).length > 1) repo.quitarMiembro(eid, email);
  revalidatePath(`/e/${eid}`, 'layout');
  if (email === u.email) redirect('/');
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

export async function reordenarEtapasAccion(equipoId: string, ids: string[]): Promise<void> {
  await miembroActual(equipoId);
  repo.reordenarEtapas(equipoId, ids.map(String));
  revalidatePath(`/e/${equipoId}`, 'layout');
}

export async function marcarEtapaFinalAccion(fd: FormData): Promise<void> {
  const eid = texto(fd, 'equipoId');
  await miembroActual(eid);
  repo.marcarEtapaFinal(texto(fd, 'etapaId'));
  revalidatePath(`/e/${eid}`, 'layout');
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export interface ResultadoRapido extends Resultado { tareaId?: string }

/** La línea rápida: «@harold revisar /master/insights esta semana». */
export async function crearTareaRapida(equipoId: string, linea: string): Promise<ResultadoRapido> {
  const u = await miembroActual(equipoId);
  const miembros = repo.miembrosDe(equipoId);
  // «mañana» o «el viernes» se cuentan desde el hoy de quien escribe, no desde el del servidor.
  const r = interpretar(linea, miembros, await hoyActual());
  if (!r.titulo) return { ok: false, error: 'faltaTitulo' };
  const t = repo.crearTarea({
    equipoId, titulo: r.titulo, asignados: r.asignados, etiquetas: r.etiquetas, enlaces: sinNombre(r.enlaces),
    fechaLimite: r.fechaLimite, prioridad: r.prioridad, creadoPor: u.email,
  });
  revalidatePath(`/e/${equipoId}`, 'layout');
  revalidatePath('/');
  return { ok: true, tareaId: t.id };
}

// ── Importar en masa ────────────────────────────────────────────────────────

export interface VistaPreviaImportacion { formato: 'csv' | 'lineas'; borradores: Borrador[] }

/** Lee el texto pegado o subido y devuelve cómo se entendió, sin guardar nada. */
export async function previsualizarImportacion(equipoId: string, texto: string): Promise<VistaPreviaImportacion> {
  await miembroActual(equipoId);
  const r = leerImportacion(texto, repo.miembrosDe(equipoId), repo.etapasDe(equipoId).map((e) => e.nombre), await hoyActual());
  return { formato: r.formato, borradores: r.borradores };
}

/** Vuelve a leer el mismo texto en el servidor, aplica lo retocado en la revisión y crea los pendientes válidos. */
export async function importarPendientes(equipoId: string, texto: string, ajustes?: AjustesImportacion): Promise<{ creados: number; omitidos: number }> {
  const u = await miembroActual(equipoId);
  const etapas = repo.etapasDe(equipoId);
  const r = leerImportacion(texto, repo.miembrosDe(equipoId), etapas.map((e) => e.nombre), await hoyActual());
  let creados = 0;
  for (const b of ajustarBorradores(r.borradores, ajustes)) {
    if (!b.valido) continue;
    repo.crearTarea({
      equipoId, titulo: b.titulo, descripcion: b.descripcion, asignados: b.asignados, etiquetas: b.etiquetas,
      enlaces: sinNombre(extraerEnlaces(b.descripcion)),
      fechaLimite: b.fechaLimite, prioridad: b.prioridad, creadoPor: u.email,
      etapaId: b.etapa ? etapas.find((e) => e.nombre === b.etapa)?.id : undefined,
    });
    creados++;
  }
  revalidatePath(`/e/${equipoId}`, 'layout');
  return { creados, omitidos: r.borradores.length - creados };
}

export type ResultadoGuardar = Resultado;

/** Las filas [enlace][nombre] del editor: se completan («drive.google.com/…» → https://) y se saltan las vacías. */
function leerEnlaces(fd: FormData) {
  const urls = fd.getAll('enlaceUrl').map(String);
  const nombres = fd.getAll('enlaceNombre').map(String);
  return urls.map((u, i) => ({ url: completarEnlace(u), nombre: (nombres[i] ?? '').trim() })).filter((e) => e.url);
}

export async function actualizarTareaAccion(fd: FormData): Promise<ResultadoGuardar> {
  const tid = texto(fd, 'tareaId');
  const t = repo.tarea(tid);
  if (!t) return { ok: false, error: 'noExiste' };
  const u = await miembroActual(t.equipoId);
  const titulo = texto(fd, 'titulo');
  if (!titulo) return { ok: false, error: 'tituloVacio' };
  const prioridad = texto(fd, 'prioridad') === 'alta' ? 'alta' : 'normal';
  repo.actualizarTarea(tid, u.email, {
    titulo,
    descripcion: String(fd.get('descripcion') ?? ''),
    fechaLimite: texto(fd, 'fechaLimite') || null,
    prioridad: prioridad as Prioridad,
    etapaId: texto(fd, 'etapaId') || undefined,
    asignados: fd.getAll('asignados').map(String),
    etiquetas: [...new Set(texto(fd, 'etiquetas').split(/[\s,;#]+/).map((x) => x.toLowerCase()).filter(Boolean))],
    enlaces: leerEnlaces(fd),
  });
  revalidatePath(`/e/${t.equipoId}`, 'layout');
  revalidatePath('/');
  return { ok: true };
}

export async function moverTareaAccion(tareaId: string, etapaId: string): Promise<void> {
  const t = repo.tarea(tareaId);
  if (!t) return;
  const u = await miembroActual(t.equipoId);
  repo.actualizarTarea(tareaId, u.email, { etapaId });
  revalidatePath(`/e/${t.equipoId}`, 'layout');
  revalidatePath('/');
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
