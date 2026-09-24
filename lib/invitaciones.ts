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
  asunto: string; titulo: string; cuerpo: string; crearCuenta: string; entrar: string; boton: string; oEnlace: string; pie: string; firma: string;
}

export interface Correo { asunto: string; html: string; texto: string }

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

// Los colores de la app (globals.css, tema claro). En correo van fijos: los clientes no leen variables.
const ACENTO = '#137a8b';
const FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * El correo de invitación: texto plano y una versión HTML con la marca, hecha
 * con tablas y estilos en línea, que es lo único que Gmail y Outlook respetan.
 * `icono` es la dirección pública del símbolo de Flujo (PNG: los correos no
 * muestran SVG).
 */
export function correoInvitacion(r: RotulosInvitacion, i: Invitado, enlace: string, icono: string): Correo {
  const paso = i.tieneCuenta ? r.entrar : r.crearCuenta;
  // El nombre del equipo, en negrita donde aparezca (en vez de entrecomillarlo).
  const equipo = esc(i.equipoNombre.trim());
  const marcar = (s: string) => (equipo ? esc(s).split(equipo).join(`<strong style="color:#132229">${equipo}</strong>`) : esc(s));
  const texto = [r.titulo, '', r.cuerpo, '', paso, enlace, '', r.pie, '', r.firma].join('\n');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(r.asunto)}</title></head>
<body style="margin:0;padding:0;background:#eef3f4;font-family:${FUENTE};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;color:#eef3f4">${esc(r.cuerpo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f4"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #dbe4e7;border-radius:16px;overflow:hidden">
  <tr><td style="padding:22px 32px;border-bottom:1px solid #e7eef0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;padding-right:10px"><img src="${esc(icono)}" width="36" height="36" alt="" style="display:block;border-radius:9px"></td>
      <td style="vertical-align:middle;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:${ACENTO}">flujo</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 32px 8px">
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:#132229">${esc(r.titulo)}</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#3b4f59">${marcar(r.cuerpo)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background:#f2f7f8;border-left:4px solid ${ACENTO};border-radius:0 10px 10px 0;padding:14px 16px;font-size:15px;line-height:1.5;color:#1f2f37">${marcar(paso)}</td>
    </tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 22px"><tr>
      <td style="background:${ACENTO};border-radius:10px"><a href="${esc(enlace)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">${esc(r.boton)} &rarr;</a></td>
    </tr></table>
    <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#8798a1">${esc(r.oEnlace)}</p>
    <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(enlace)}" style="color:${ACENTO};text-decoration:underline">${esc(enlace)}</a></p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f7fafb;border-top:1px solid #e7eef0;font-size:12px;line-height:1.5;color:#8798a1">
    ${esc(r.pie)}<br><span style="color:#a9b7bd">${esc(r.firma)}</span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { asunto: r.asunto, html, texto };
}
