// ──────────────────────────────────────────────────────────────────────────────
// ENVÍO DE CORREO — por SMTP (una cuenta de Gmail, sin dominio propio) o por
// Resend (https://resend.com, con dominio verificado). Si no hay ninguno, Flujo
// no manda nada y avisa en pantalla que hay que pasar el enlace a mano.
//
// Variables (en el .env de la máquina, nunca en el repo):
//   SMTP_USUARIO     la cuenta que envía, ej. flujo.io.app@gmail.com. Con ella y
//   SMTP_CLAVE       su «contraseña de aplicación» (16 letras, no la contraseña
//                    normal; exige tener la verificación en dos pasos) se manda
//                    por SMTP, y tiene prioridad sobre Resend. Gmail deja unos
//                    500 correos al día.
//   SMTP_HOST        opcional, por omisión smtp.gmail.com (puerto SMTP_PUERTO, 465).
//   RESEND_API_KEY   la clave de Resend. Sin dominio verificado, su remitente de
//                    prueba (onboarding@resend.dev) sólo llega al dueño de la cuenta.
//   FLUJO_REMITENTE  de quién sale, ej. "Flujo <flujo@xertica.com>". Con SMTP, por
//                    omisión «Flujo <SMTP_USUARIO>»: Gmail no deja firmar como otro.
//   FLUJO_URL        la dirección pública de la app para armar los enlaces, ej.
//                    https://flujo.xertica.com. Si falta, se toma de la petición.
// ──────────────────────────────────────────────────────────────────────────────

import nodemailer, { type Transporter } from 'nodemailer';
import type { Correo } from './invitaciones';

const REMITENTE_PRUEBA = 'Flujo <onboarding@resend.dev>';

type Entorno = Record<string, string | undefined>;

/** Por dónde sale el correo con esta configuración: SMTP gana si está completo. */
export function proveedor(env: Entorno = process.env): 'smtp' | 'resend' | null {
  if (env.SMTP_USUARIO?.trim() && env.SMTP_CLAVE?.trim()) return 'smtp';
  if (env.RESEND_API_KEY?.trim()) return 'resend';
  return null;
}

export function correoConfigurado(): boolean {
  return proveedor() !== null;
}

export function remitente(env: Entorno = process.env): string {
  const fijo = env.FLUJO_REMITENTE?.trim();
  if (fijo) return fijo;
  return proveedor(env) === 'smtp' ? `Flujo <${env.SMTP_USUARIO!.trim()}>` : REMITENTE_PRUEBA;
}

// Una sola conexión reutilizable por proceso (nodemailer la mantiene y la reabre si hace falta).
let smtp: Transporter | null = null;
function transporteSmtp(): Transporter {
  if (!smtp) {
    const puerto = Number(process.env.SMTP_PUERTO) || 465;
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: puerto,
      secure: puerto === 465,
      // Google muestra la contraseña de aplicación en grupos con espacios; se aceptan igual.
      auth: { user: process.env.SMTP_USUARIO!.trim(), pass: process.env.SMTP_CLAVE!.replace(/\s+/g, '') },
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return smtp;
}

/** Manda un correo. Nunca lanza: si falla, lo anota en el registro y devuelve false. */
export async function enviarCorreo(para: string, c: Correo): Promise<boolean> {
  const via = proveedor();
  if (!via) return false;
  try {
    if (via === 'smtp') {
      await transporteSmtp().sendMail({ from: remitente(), to: para, subject: c.asunto, html: c.html, text: c.texto });
      return true;
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remitente(), to: [para], subject: c.asunto, html: c.html, text: c.texto }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error(`[correo] Resend respondió ${r.status} al escribir a ${para}: ${(await r.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[correo] no se pudo escribir a ${para} (${via}):`, e instanceof Error ? e.message : e);
    return false;
  }
}
