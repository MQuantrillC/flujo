// ──────────────────────────────────────────────────────────────────────────────
// LA LÍNEA RÁPIDA — de «@harold revisar /master/insights esta semana #insights»
// a un pendiente con responsable, título, etiquetas y fecha límite.
//
//   @nombre      → responsable (se busca entre los miembros del equipo)
//   #etiqueta    → etiqueta
//   !            → prioridad alta (también «!alta» o «!urgente»)
//   fechas       → en español, inglés o portugués, mezclados como se quiera:
//                  hoy · today · hoje · mañana · tomorrow · amanhã · pasado mañana ·
//                  esta semana / this week (viernes) · próxima semana / next week /
//                  semana que vem · fin de mes / end of month / fim do mês ·
//                  en 3 días / in 3 days / em 3 dias · el lunes / monday / segunda ·
//                  15 oct / oct 15 / 15 out · 15/10 · 2026-10-15
//
// Lo que sobra es el título. Puro: sin base de datos ni React, y con pruebas.
// ──────────────────────────────────────────────────────────────────────────────

import { aIso, dia, finDeMes, proximoDiaSemana, sumarDias, viernesDeLaSemana, viernesProximaSemana } from './fechas';

export interface MiembroParaParse { email: string; nombre: string }

export interface Interpretacion {
  titulo: string;
  /** Correos de los @ que sí se encontraron en el equipo. */
  asignados: string[];
  /** Los @ que no coinciden con nadie, para avisar. */
  noResueltos: string[];
  etiquetas: string[];
  fechaLimite: string | null;
  /** Las palabras que se leyeron como fecha, tal como se escribieron. */
  fechaTexto: string | null;
  prioridad: 'alta' | 'normal';
}

/** Minúsculas y sin acentos, carácter a carácter, para que los índices coincidan con el original. */
function normalizar(s: string): string {
  return Array.from(s).map((c) => {
    const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return n.length === 1 ? n : c.toLowerCase();
  }).join('');
}

// Días de la semana en los tres idiomas → 0 domingo … 6 sábado.
const DIAS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5,
};
const MESES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
  jan: 0, apr: 3, aug: 7, dec: 11,
  fev: 1, mai: 4, out: 9, dez: 11,
};
const NUMEROS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  um: 1, uma: 1, dois: 2, duas: 2, quatro: 4, seis_: 6, sete: 7, oito: 8, nove: 9, dez_: 10,
};

const DIAS_RE = Object.keys(DIAS).join('|');
const MESES_RE = Object.keys(MESES).join('|');
const NUM_RE = '\\d{1,3}|' + Object.keys(NUMEROS).filter((k) => !k.endsWith('_')).join('|');
/** Palabras que suelen ir antes de una fecha y se quitan con ella: «para el», «antes del», «by», «até». */
const PREFIJO = '(?:para el |para |antes del |antes de |hasta el |hasta |el proximo |la proxima |el |este |esta |al |a |by |on |before |until |next |this |ate o |ate a |ate |na |no |antes do |antes da |proxima |proximo |nesta |neste |para a |para o )?';

type Regla = { re: RegExp; fecha: (m: RegExpMatchArray, hoy: Date) => Date | null };

/** Del día/mes al próximo año si ya pasó. */
function diaMes(hoy: Date, d: number, m: number, anio?: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  let f = new Date(anio ?? hoy.getFullYear(), m, d, 12);
  if (f.getMonth() !== m) return null; // 31 de febrero, por ejemplo
  if (anio === undefined && f < hoy) f = new Date(hoy.getFullYear() + 1, m, d, 12);
  return f;
}

const anio = (s: string | undefined) => (s ? (s.length === 2 ? 2000 + Number(s) : Number(s)) : undefined);

const REGLAS: Regla[] = [
  { re: new RegExp(`\\b${PREFIJO}(?:pasado manana|day after tomorrow|depois de amanha)\\b`), fecha: (_, h) => sumarDias(h, 2) },
  { re: new RegExp(`\\b${PREFIJO}(?:manana|tomorrow|amanha)\\b`), fecha: (_, h) => sumarDias(h, 1) },
  { re: new RegExp(`\\b${PREFIJO}(?:hoy|today|hoje)\\b`), fecha: (_, h) => h },
  { re: new RegExp(`\\b(?:para |durante |en |by |for |nesta |durante a |ate )?(?:esta semana|essa semana|this week|end of week|end of the week)\\b`), fecha: (_, h) => viernesDeLaSemana(h) },
  { re: new RegExp(`\\b(?:para |durante |en |by |for |na |ate )?(?:la |a )?(?:proxima semana|siguiente semana|otra semana|next week|semana que vem)\\b`), fecha: (_, h) => viernesProximaSemana(h) },
  { re: new RegExp(`\\b(?:para |a |antes de |antes del |hasta |by |before |until |ate |antes do )?(?:el |the |o )?(?:fin de mes|end of month|end of the month|fim do mes|final do mes)\\b`), fecha: (_, h) => finDeMes(h) },
  {
    re: new RegExp(`\\b(?:en|in|em) (${NUM_RE}) (dias?|semanas?|days?|weeks?)\\b`),
    fecha: (m, h) => { const n = NUMEROS[m[1]] ?? Number(m[1]); return sumarDias(h, /^(semana|week)/.test(m[2]) ? n * 7 : n); },
  },
  {
    re: new RegExp(`\\b${PREFIJO}(${DIAS_RE})(?:-feira)?\\b`),
    fecha: (m, h) => proximoDiaSemana(h, DIAS[m[1]]),
  },
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, fecha: (m, h) => diaMes(h, Number(m[3]), Number(m[2]) - 1, Number(m[1])) },
  {
    re: new RegExp(`\\b${PREFIJO}(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2}|\\d{4}))?\\b`),
    fecha: (m, h) => diaMes(h, Number(m[1]), Number(m[2]) - 1, anio(m[3])),
  },
  {
    re: new RegExp(`\\b${PREFIJO}(\\d{1,2}) (?:de |of )?(${MESES_RE})[a-z]*\\.?(?: (?:de |del |of |, )?(\\d{4}))?\\b`),
    fecha: (m, h) => diaMes(h, Number(m[1]), MESES[m[2]], anio(m[3])),
  },
  {
    // Orden inglés: «oct 15», «october 15th, 2026».
    re: new RegExp(`\\b${PREFIJO}(${MESES_RE})[a-z]*\\.? (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?\\b`),
    fecha: (m, h) => diaMes(h, Number(m[2]), MESES[m[1]], anio(m[3])),
  },
];

/** La primera fecha que se entiende en el texto, y dónde está, para poder quitarla del título. */
export function leerFecha(texto: string, hoy: Date = dia()): { iso: string; inicio: number; fin: number } | null {
  const hoyD = dia(hoy);
  const norm = normalizar(texto);
  for (const regla of REGLAS) {
    const m = norm.match(regla.re);
    if (!m || m.index === undefined) continue;
    const f = regla.fecha(m, hoyD);
    if (!f) continue;
    return { iso: aIso(f), inicio: m.index, fin: m.index + m[0].length };
  }
  return null;
}

/** Encuentra al miembro que mejor calza con «@harold», «@harold.suarez», «@HaroldSuarez». */
export function resolverMiembro(alias: string, miembros: MiembroParaParse[]): MiembroParaParse | null {
  const a = normalizar(alias).replace(/[^a-z0-9.]/g, '');
  if (!a) return null;
  const candidatos = miembros.map((m) => {
    const local = normalizar(m.email.split('@')[0]);
    const nombre = normalizar(m.nombre);
    const primero = nombre.split(/\s+/)[0] ?? '';
    const junto = nombre.replace(/\s+/g, '');
    const exacto = a === local || a === primero || a === junto || a === local.split('.')[0];
    const prefijo = local.startsWith(a) || primero.startsWith(a) || junto.startsWith(a);
    return { m, exacto, prefijo };
  });
  return candidatos.find((c) => c.exacto)?.m ?? candidatos.find((c) => c.prefijo)?.m ?? null;
}

export function interpretar(texto: string, miembros: MiembroParaParse[], hoy: Date = dia()): Interpretacion {
  const hoyD = dia(hoy);
  let resto = texto;
  const asignados: string[] = [];
  const noResueltos: string[] = [];
  const etiquetas: string[] = [];
  let prioridad: 'alta' | 'normal' = 'normal';

  // @responsables
  resto = resto.replace(/(^|\s)@([\w.\-]+)/g, (_, esp: string, alias: string) => {
    const m = resolverMiembro(alias, miembros);
    if (m) { if (!asignados.includes(m.email)) asignados.push(m.email); } else noResueltos.push(alias);
    return esp;
  });
  // #etiquetas
  resto = resto.replace(/(^|\s)#([\p{L}\p{N}_\-]+)/gu, (_, esp: string, tag: string) => {
    const t = tag.toLowerCase();
    if (!etiquetas.includes(t)) etiquetas.push(t);
    return esp;
  });
  // ! prioridad
  resto = resto.replace(/(^|\s)!(alta|urgente|high|urgent)?(?=\s|$)/gi, (_, esp: string) => { prioridad = 'alta'; return esp; });
  if (/!\s*$/.test(resto)) { prioridad = 'alta'; resto = resto.replace(/\s*!+\s*$/, ''); }

  // fecha límite: la primera regla que calce
  let fechaLimite: string | null = null;
  let fechaTexto: string | null = null;
  const f = leerFecha(resto, hoyD);
  if (f) {
    fechaLimite = f.iso;
    fechaTexto = resto.slice(f.inicio, f.fin).trim();
    resto = resto.slice(0, f.inicio) + ' ' + resto.slice(f.fin);
  }

  let titulo = resto.replace(/\s+/g, ' ').trim().replace(/^[\s,;:\-–]+|[\s,;:\-–]+$/g, '');
  if (titulo) titulo = titulo[0].toUpperCase() + titulo.slice(1);

  return { titulo, asignados, noResueltos, etiquetas, fechaLimite, fechaTexto, prioridad };
}
