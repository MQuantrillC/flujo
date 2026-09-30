// ──────────────────────────────────────────────────────────────────────────────
// AVISOS POR CORREO — a quién se le escribe cuando alguien toca un pendiente, y
// cómo es ese correo. Todo puro (sin base ni red), para poder probarlo; quien
// lee la base y manda es lib/notificar.ts.
//
// La regla: se avisa a los responsables del pendiente, nunca a quien hizo el
// cambio, sólo a quien ya tiene cuenta y sólo si no apagó los avisos de ese
// equipo en Ajustes. Lo que pasó se lee del historial (tabla eventos), así un
// guardado que cambia fecha y etapa a la vez es un solo correo con dos líneas.
// ──────────────────────────────────────────────────────────────────────────────

import type { Evento } from './modelo';
import { ACENTO, FUENTE, esc, type Correo } from './invitaciones';

/** Por qué le llega: le asignaron el pendiente, lo comentaron o lo cambiaron. */
export type MotivoAviso = 'asignado' | 'comentario' | 'cambio';

export interface Destinatario { email: string; motivo: MotivoAviso }

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/**
 * A quién se avisa por estos eventos (todos del mismo autor sobre el mismo
 * pendiente) y por qué. `asignados` son los responsables después del cambio.
 */
export function destinatarios(eventos: Pick<Evento, 'tipo' | 'detalle'>[], { asignados, autor, silenciados, conCuenta }: {
  asignados: string[]; autor: string; silenciados: Set<string>; conCuenta: Set<string>;
}): Destinatario[] {
  if (eventos.length === 0) return [];
  const nuevos = new Set<string>();
  for (const e of eventos) {
    if (e.tipo === 'creada') lista(e.detalle.asignados).forEach((x) => nuevos.add(x));
    if (e.tipo === 'asignados') { const de = lista(e.detalle.de); lista(e.detalle.a).filter((x) => !de.includes(x)).forEach((x) => nuevos.add(x)); }
  }
  const hayComentario = eventos.some((e) => e.tipo === 'comentario');
  // Crear un pendiente sólo le importa a quien queda asignado; el resto de eventos es un cambio.
  const hayCambio = eventos.some((e) => e.tipo !== 'creada' && e.tipo !== 'comentario');
  const out: Destinatario[] = [];
  for (const email of new Set(asignados)) {
    if (email === autor || silenciados.has(email) || !conCuenta.has(email)) continue;
    const motivo: MotivoAviso | null = nuevos.has(email) ? 'asignado' : hayComentario ? 'comentario' : hayCambio ? 'cambio' : null;
    if (motivo) out.push({ email, motivo });
  }
  return out;
}

export interface DatosAviso {
  asunto: string;
  titulo: string;
  /** «En el equipo …». */
  equipo: string;
  /** El pendiente: su título y sus datos cortos (etapa, vence …). */
  pendiente: string;
  meta: string[];
  /** Lo que cambió, una línea cada cosa (puede ir vacío). */
  lineas: string[];
  /** Si comentaron: quién y qué dijo. */
  comentario: { rotulo: string; texto: string } | null;
  boton: string;
  oEnlace: string;
  pie: string;
  apagar: string;
  firma: string;
}

const MAX_COMENTARIO = 600;

/**
 * El correo: la misma carcasa que la invitación (tablas y estilos en línea),
 * con el pendiente en una tarjeta, lo que cambió en una lista, el comentario
 * citado y un botón que abre la ficha del pendiente en su equipo.
 */
export function correoAviso(d: DatosAviso, enlace: string, enlaceAjustes: string, icono: string): Correo {
  const cita = d.comentario ? (d.comentario.texto.length > MAX_COMENTARIO ? d.comentario.texto.slice(0, MAX_COMENTARIO).trimEnd() + '…' : d.comentario.texto) : '';
  const texto = [
    d.titulo, d.equipo, '',
    d.pendiente, ...d.meta.map((m) => `  ${m}`), '',
    ...(d.comentario ? [d.comentario.rotulo, cita, ''] : []),
    ...(d.lineas.length ? [...d.lineas.map((l) => `· ${l}`), ''] : []),
    `${d.boton}: ${enlace}`, '',
    d.pie, `${d.apagar}: ${enlaceAjustes}`, '', d.firma,
  ].join('\n');
  const parrafos = (s: string) => esc(s).replace(/\n/g, '<br>');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(d.asunto)}</title></head>
<body style="margin:0;padding:0;background:#eef3f4;font-family:${FUENTE};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;color:#eef3f4">${esc(d.pendiente)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f4"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #dbe4e7;border-radius:16px;overflow:hidden">
  <tr><td style="padding:22px 32px;border-bottom:1px solid #e7eef0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;padding-right:10px"><img src="${esc(icono)}" width="36" height="36" alt="" style="display:block;border-radius:9px"></td>
      <td style="vertical-align:middle;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:${ACENTO}">flujo</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:30px 32px 8px">
    <h1 style="margin:0 0 6px;font-size:21px;line-height:1.3;font-weight:700;color:#132229">${esc(d.titulo)}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#6b7a80">${esc(d.equipo)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background:#f2f7f8;border-left:4px solid ${ACENTO};border-radius:0 10px 10px 0;padding:14px 16px">
        <div style="font-size:16px;line-height:1.45;font-weight:600;color:#132229">${esc(d.pendiente)}</div>
        ${d.meta.length ? `<div style="margin-top:6px;font-size:13px;line-height:1.5;color:#5b6d74">${d.meta.map(esc).join(' &nbsp;·&nbsp; ')}</div>` : ''}
      </td>
    </tr></table>
    ${d.comentario ? `<p style="margin:22px 0 6px;font-size:13px;font-weight:600;color:#3b4f59">${esc(d.comentario.rotulo)}</p>
    <div style="border:1px solid #e2e9eb;border-radius:10px;padding:12px 14px;font-size:15px;line-height:1.55;color:#1f2f37">${parrafos(cita)}</div>` : ''}
    ${d.lineas.length ? `<ul style="margin:20px 0 0;padding:0 0 0 18px;font-size:14px;line-height:1.7;color:#3b4f59">${d.lineas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 22px"><tr>
      <td style="background:${ACENTO};border-radius:10px"><a href="${esc(enlace)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">${esc(d.boton)} &rarr;</a></td>
    </tr></table>
    <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#8798a1">${esc(d.oEnlace)}</p>
    <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(enlace)}" style="color:${ACENTO};text-decoration:underline">${esc(enlace)}</a></p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f7fafb;border-top:1px solid #e7eef0;font-size:12px;line-height:1.5;color:#8798a1">
    ${esc(d.pie)} <a href="${esc(enlaceAjustes)}" style="color:${ACENTO};text-decoration:underline">${esc(d.apagar)}</a><br><span style="color:#a9b7bd">${esc(d.firma)}</span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { asunto: d.asunto, html, texto };
}
