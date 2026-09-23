// ──────────────────────────────────────────────────────────────────────────────
// FECHAS — todo en fecha local, sin horas. Una fecha límite es un día («2026-09-25»),
// y se guarda como texto ISO para que ordene bien y no dependa de la zona horaria.
// Lo que se muestra («vie 25 sep», «hace 3 h») sale en el idioma que se pida.
// ──────────────────────────────────────────────────────────────────────────────

import type { Idioma } from './idioma';

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

const NOMBRES: Record<Idioma, { dias: string[]; meses: string[]; hoy: string; manana: string; ayer: string; ahora: string; min: (n: number) => string; horas: (n: number) => string }> = {
  es: {
    dias: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    meses: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    hoy: 'hoy', manana: 'mañana', ayer: 'ayer', ahora: 'ahora', min: (n) => `hace ${n} min`, horas: (n) => `hace ${n} h`,
  },
  en: {
    dias: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    hoy: 'today', manana: 'tomorrow', ayer: 'yesterday', ahora: 'now', min: (n) => `${n} min ago`, horas: (n) => `${n} h ago`,
  },
  pt: {
    dias: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    meses: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    hoy: 'hoje', manana: 'amanhã', ayer: 'ontem', ahora: 'agora', min: (n) => `há ${n} min`, horas: (n) => `há ${n} h`,
  },
};

/** «hoy», «mañana», «ayer», «vie 25 sep», «lun 12 ene 2027» — o su equivalente en inglés y portugués. */
export function fechaCorta(iso: string, hoy: Date = dia(), idioma: Idioma = 'es'): string {
  const n = diasHasta(iso, hoy);
  const x = NOMBRES[idioma];
  if (n === 0) return x.hoy;
  if (n === 1) return x.manana;
  if (n === -1) return x.ayer;
  const d = deIso(iso);
  const base = idioma === 'en' ? `${x.dias[d.getDay()]} ${x.meses[d.getMonth()]} ${d.getDate()}` : `${x.dias[d.getDay()]} ${d.getDate()} ${x.meses[d.getMonth()]}`;
  return d.getFullYear() === hoy.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** «hace 5 min», «hace 3 h», «ayer», «12 sep». */
export function haceCuanto(epochMs: number, ahora: number = Date.now(), idioma: Idioma = 'es'): string {
  const x = NOMBRES[idioma];
  const s = Math.max(0, Math.round((ahora - epochMs) / 1000));
  if (s < 60) return x.ahora;
  const m = Math.round(s / 60);
  if (m < 60) return x.min(m);
  const h = Math.round(m / 60);
  if (h < 24) return x.horas(h);
  return fechaCorta(aIso(new Date(epochMs)), dia(new Date(ahora)), idioma);
}
