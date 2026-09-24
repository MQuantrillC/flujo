// ──────────────────────────────────────────────────────────────────────────────
// QUIÉN ESTÁ USANDO LA APP
//
// Cada persona tiene una cuenta (correo y contraseña). Al entrar se abre una
// sesión en la base y su token va en una cookie que sólo el servidor lee.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Usuario } from './modelo';
import { emailDeSesion, esMiembro, usuario } from './repositorio';

export const COOKIE_SESION = 'flujo_sesion';
/** Segundos: la sesión dura 90 días. */
export const DURACION_SESION = 60 * 60 * 24 * 90;

export function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function tokenActual(): Promise<string | null> {
  return (await cookies()).get(COOKIE_SESION)?.value ?? null;
}

export async function correoActual(): Promise<string | null> {
  const token = await tokenActual();
  return token ? emailDeSesion(token) : null;
}

/** El usuario de esta petición; sin sesión, manda a /entrar. */
export async function usuarioActual(): Promise<Usuario> {
  const email = await correoActual();
  const u = email ? usuario(email) : null;
  if (!u) redirect('/entrar');
  return u;
}

/** El usuario, y sólo si es del equipo. Si no, a la lista de equipos. */
export async function miembroActual(equipoId: string): Promise<Usuario> {
  const u = await usuarioActual();
  if (!esMiembro(equipoId, u.email)) redirect('/');
  return u;
}
