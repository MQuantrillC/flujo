// ──────────────────────────────────────────────────────────────────────────────
// ZONA HORARIA — «hoy» es el día de quien usa la app, no el del servidor (que
// vive en UTC). El navegador manda su zona en una cookie y el servidor calcula
// la fecha de hoy en esa zona. Puro: sirve en el navegador y en el servidor.
// ──────────────────────────────────────────────────────────────────────────────

export const COOKIE_ZONA = 'flujo_zona';
/** Mientras el navegador no haya dicho la suya: la del equipo. */
export const ZONA_POR_DEFECTO = 'America/Lima';

export function zonaValida(z: unknown): z is string {
  if (typeof z !== 'string' || !z || z.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch { return false; }
}

/** El día de hoy en `zona`, como fecha a mediodía (hora del servidor) para operar con lib/fechas. */
export function hoyEn(zona: string, ahora: Date = new Date()): Date {
  const z = zonaValida(zona) ? zona : ZONA_POR_DEFECTO;
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
  const n = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  return new Date(n('year'), n('month') - 1, n('day'), 12);
}

/** La zona del navegador, tal como la reporta. */
export function zonaDelNavegador(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_POR_DEFECTO; } catch { return ZONA_POR_DEFECTO; }
}
