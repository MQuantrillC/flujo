// ──────────────────────────────────────────────────────────────────────────────
// QUIÉN ESTÁ USANDO LA APP
//
// En la nube, detrás de Identity-Aware Proxy, el correo llega en una cabecera
// (el mismo esquema que Account Plan). Mientras corre en una máquina, cada
// persona elige su correo en /entrar y queda en una cookie. Esa cookie sólo se
// lee fuera de producción: en la nube nunca sirve para hacerse pasar por otro.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Usuario } from './modelo';
import { asegurarUsuario, esMiembro } from './repositorio';

export const COOKIE_USUARIO = 'flujo_usuario';

export function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function correoActual(): Promise<string | null> {
  const h = await headers();
  const iap = h.get('x-goog-authenticated-user-email');
  if (iap) return iap.replace('accounts.google.com:', '').trim().toLowerCase();
  if (!esProduccion()) {
    const c = (await cookies()).get(COOKIE_USUARIO)?.value?.trim().toLowerCase();
    if (c && c.includes('@')) return c;
  }
  return null;
}

/** El usuario de esta petición; sin sesión, manda a /entrar. */
export async function usuarioActual(): Promise<Usuario> {
  const email = await correoActual();
  if (!email) redirect('/entrar');
  return asegurarUsuario(email);
}

/** El usuario, y sólo si es del equipo. Si no, a la lista de equipos. */
export async function miembroActual(equipoId: string): Promise<Usuario> {
  const u = await usuarioActual();
  if (!esMiembro(equipoId, u.email)) redirect('/');
  return u;
}
