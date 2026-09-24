// ──────────────────────────────────────────────────────────────────────────────
// ENVÍO DE CORREO — por Resend (https://resend.com), sólo si hay clave.
//
// Variables (en el .env de la máquina, nunca en el repo):
//   RESEND_API_KEY   la clave de Resend. Sin ella Flujo no manda nada y avisa en
//                    pantalla que hay que pasar el enlace a mano.
//   FLUJO_REMITENTE  de quién sale, ej. "Flujo <flujo@xertica.com>". El dominio
//                    tiene que estar verificado en Resend; el de prueba
//                    (onboarding@resend.dev) sólo llega al dueño de la cuenta.
//   FLUJO_URL        la dirección pública de la app para armar los enlaces, ej.
//                    https://flujo.xertica.com. Si falta, se toma de la petición.
// ──────────────────────────────────────────────────────────────────────────────

import type { Correo } from './invitaciones';

const REMITENTE_PRUEBA = 'Flujo <onboarding@resend.dev>';

export function correoConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function remitente(): string {
  return process.env.FLUJO_REMITENTE?.trim() || REMITENTE_PRUEBA;
}

/** Manda un correo. Nunca lanza: si falla, lo anota en el registro y devuelve false. */
export async function enviarCorreo(para: string, c: Correo): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remitente(), to: [para], subject: c.asunto, html: c.html, text: c.texto }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error(`[correo] Resend respondió ${r.status} al escribir a ${para}: ${(await r.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[correo] no se pudo escribir a ${para}:`, e instanceof Error ? e.message : e);
    return false;
  }
}
