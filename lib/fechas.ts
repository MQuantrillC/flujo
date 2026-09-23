// ──────────────────────────────────────────────────────────────────────────────
// FECHAS — todo en fecha local, sin horas. Una fecha límite es un día («2026-09-25»),
// y se guarda como texto ISO para que ordene bien y no dependa de la zona horaria.
// ──────────────────────────────────────────────────────────────────────────────

const p2 = (n: number) => String(n).padStart(2, '0');

/** El día de hoy (o el de `base`) a mediodía local, para sumar días sin sustos de horario. */
export function dia(base: Date = new Date()): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12);
}

export function aIso(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function deIso(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** El viernes de la semana de `d`. En sábado o domingo, el viernes que viene. */
export function viernesDeLaSemana(d: Date): Date {
  return sumarDias(d, (5 - d.getDay() + 7) % 7);
}

/** El viernes de la semana siguiente. En fin de semana, «la próxima» es la que empieza el lunes. */
export function viernesProximaSemana(d: Date): Date {
  const esFinDeSemana = d.getDay() === 6 || d.getDay() === 0;
  return esFinDeSemana ? viernesDeLaSemana(d) : sumarDias(viernesDeLaSemana(d), 7);
}

export function finDeMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
}

/** Próximo día de la semana (0 domingo … 6 sábado). Si es hoy, hoy. */
export function proximoDiaSemana(d: Date, diaSemana: number): Date {
  return sumarDias(d, (diaSemana - d.getDay() + 7) % 7);
}

export function diasHasta(iso: string, hoy: Date = dia()): number {
  return Math.round((deIso(iso).getTime() - dia(hoy).getTime()) / 86_400_000);
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «hoy», «mañana», «ayer», «vie 25 sep», «lun 12 ene 2027». */
export function fechaCorta(iso: string, hoy: Date = dia()): string {
  const n = diasHasta(iso, hoy);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  const d = deIso(iso);
  const base = `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
  return d.getFullYear() === hoy.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** «hace 5 min», «hace 3 h», «ayer», «12 sep». */
export function haceCuanto(epochMs: number, ahora: number = Date.now()): string {
  const s = Math.max(0, Math.round((ahora - epochMs) / 1000));
  if (s < 60) return 'ahora';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return fechaCorta(aIso(new Date(epochMs)), dia(new Date(ahora)));
}
