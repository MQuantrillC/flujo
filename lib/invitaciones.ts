// ──────────────────────────────────────────────────────────────────────────────
// INVITACIONES — el enlace que se le pasa a alguien para que entre a un equipo,
// y el correo que se le manda si el envío está configurado (lib/correo.ts).
// Todo puro: sin base ni red, para poder probarlo.
// ──────────────────────────────────────────────────────────────────────────────

export interface Invitado {
  email: string;
  equipoId: string;
  equipoNombre: string;
  /** Si ya tiene cuenta, el enlace va directo al equipo; si no, al registro con el correo puesto. */
  tieneCuenta: boolean;
}

/** `base` sin barra final, ej. https://flujo.xertica.com */
export function enlaceInvitacion(base: string, i: Invitado): string {
  const b = base.replace(/\/+$/, '');
  if (i.tieneCuenta) return `${b}/e/${i.equipoId}`;
  const q = new URLSearchParams({ correo: i.email, equipo: i.equipoNombre });
  return `${b}/registro?${q.toString()}`;
}

export interface RotulosInvitacion {
  asunto: string; hola: string; cuerpo: string; crearCuenta: string; entrar: string; boton: string; pie: string;
}

export interface Correo { asunto: string; html: string; texto: string }

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** El correo de invitación, en texto plano y en HTML sencillo (sin imágenes ni estilos raros, para que no caiga en spam). */
export function correoInvitacion(r: RotulosInvitacion, i: Invitado, enlace: string): Correo {
  const paso = i.tieneCuenta ? r.entrar : r.crearCuenta;
  const texto = [r.hola, '', r.cuerpo, '', paso, enlace, '', r.pie].join('\n');
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
<p style="margin:0 0 12px;font-size:15px">${esc(r.hola)}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(r.cuerpo)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5">${esc(paso)}</p>
<p style="margin:0 0 20px"><a href="${esc(enlace)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:10px 18px;border-radius:8px">${esc(r.boton)}</a></p>
<p style="margin:0 0 20px;font-size:12px;color:#6b7280;word-break:break-all">${esc(enlace)}</p>
<p style="margin:0;font-size:12px;color:#9ca3af">${esc(r.pie)}</p>
</div></body></html>`;
  return { asunto: r.asunto, html, texto };
}
