// ──────────────────────────────────────────────────────────────────────────────
// IMPORTAR PENDIENTES EN MASA
//
// Dos formatos de entrada, los dos pensados para que una IA (o una persona) los
// produzca sin esfuerzo a partir de cualquier lista:
//
//   1. CSV con encabezados: titulo, responsables, fecha_limite, etiquetas,
//      prioridad, etapa, descripcion. Los encabezados se reconocen con
//      variantes en español, inglés y portugués y en cualquier orden; sobran o
//      faltan columnas sin problema.
//   2. Una lista de líneas, cada una con la sintaxis de la línea rápida:
//      «@harold revisar /master/insights esta semana #insights». Se aceptan
//      viñetas («- », «* », «1. », «[ ] »).
//
// Puro y probado: recibe texto, devuelve borradores con sus avisos (como claves,
// que la pantalla traduce). Nada se guarda aquí.
// ──────────────────────────────────────────────────────────────────────────────

import { aIso, dia } from './fechas';
import type { Idioma } from './idioma';
import { interpretar, leerFecha, resolverMiembro, type MiembroParaParse } from './parseRapido';

export type Aviso =
  | { clave: 'sinTitulo' }
  | { clave: 'noEsDelEquipo' | 'fechaNoEntendida' | 'etapaNoExiste'; valor: string };

export interface Borrador {
  linea: number;
  titulo: string;
  descripcion: string;
  asignados: string[];
  noResueltos: string[];
  etiquetas: string[];
  fechaLimite: string | null;
  prioridad: 'alta' | 'normal';
  /** Nombre de etapa del equipo, ya resuelto; null = la primera. */
  etapa: string | null;
  avisos: Aviso[];
  /** Sin título no se importa. */
  valido: boolean;
}

export interface ResultadoLectura { formato: 'csv' | 'lineas'; borradores: Borrador[] }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const COLUMNAS: Record<string, string[]> = {
  titulo: ['titulo', 'title', 'pendiente', 'pendencia', 'tarea', 'tarefa', 'task', 'nombre', 'nome', 'name', 'asunto', 'que', 'que hacer', 'to-do', 'todo', 'item'],
  asignados: ['responsables', 'responsable', 'responsaveis', 'responsavel', 'asignados', 'asignado', 'asignado a', 'atribuido a', 'atribuido', 'owner', 'assignee', 'assignees', 'assigned to', 'quien', 'quem', 'para', 'persona', 'pessoa', 'encargado', 'who'],
  fecha: ['fecha_limite', 'fecha limite', 'fecha', 'data_limite', 'data limite', 'data', 'vence', 'vencimento', 'vencimiento', 'deadline', 'due', 'due date', 'due_date', 'plazo', 'prazo', 'para cuando', 'entrega', 'date', 'when', 'cuando', 'quando'],
  etiquetas: ['etiquetas', 'etiqueta', 'tags', 'tag', 'categoria', 'categorias', 'category', 'labels', 'label', 'tema', 'area', 'assunto'],
  prioridad: ['prioridad', 'prioridade', 'priority', 'urgencia', 'urgency', 'importancia'],
  etapa: ['etapa', 'estado', 'status', 'stage', 'columna', 'coluna', 'column', 'state', 'situacao'],
  descripcion: ['descripcion', 'descricao', 'description', 'detalle', 'detalles', 'detalhes', 'notas', 'notes', 'comentario', 'comentarios', 'contexto', 'context', 'details'],
};

/** CSV con comillas, saltos de línea dentro de celdas, y coma, punto y coma o tabulador como separador. */
export function leerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/)[0] ?? '';
  const sep = [',', ';', '\t'].map((s) => ({ s, n: primera.split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const filas: string[][] = []; let fila: string[] = []; let celda = ''; let enComillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++; } else if (c === '"') enComillas = false; else celda += c;
    } else if (c === '"') enComillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else if (c !== '\r') celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.map((f) => f.map((x) => x.trim())).filter((f) => f.some(Boolean));
}

/** ¿La primera línea parece un encabezado de CSV con columnas conocidas? */
export function pareceCsv(texto: string): boolean {
  const [cab] = leerCsv(texto.split(/\r?\n/).slice(0, 1).join('\n'));
  if (!cab || cab.length < 2) return false;
  const conocidas = cab.filter((c) => Object.values(COLUMNAS).some((v) => v.includes(normalizar(c)))).length;
  return conocidas >= 2 || (conocidas >= 1 && cab.some((c) => COLUMNAS.titulo.includes(normalizar(c))));
}

function columnaDe(cabecera: string): string | null {
  const n = normalizar(cabecera);
  for (const [clave, nombres] of Object.entries(COLUMNAS)) if (nombres.includes(n)) return clave;
  return null;
}

/** «2026-10-15», «15/10/2026», «15/10», «15 oct», «esta semana», «el viernes»… */
export function fechaDeCelda(valor: string, hoy: Date): { iso: string | null; aviso?: Aviso } {
  const v = valor.trim();
  if (!v) return { iso: null };
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { iso: iso[0] };
  const dmy = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return { iso: `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` };
  const f = leerFecha(v, hoy);
  return f ? { iso: f.iso } : { iso: null, aviso: { clave: 'fechaNoEntendida', valor: v } };
}

function separar(v: string): string[] {
  return v.split(/[;,|]| y | and | e /).map((x) => x.replace(/^[@#]/, '').trim()).filter(Boolean);
}

function resolverEtapa(v: string, etapas: string[]): { etapa: string | null; aviso?: Aviso } {
  const n = normalizar(v);
  if (!n) return { etapa: null };
  const e = etapas.find((x) => normalizar(x) === n) ?? etapas.find((x) => normalizar(x).startsWith(n) || n.startsWith(normalizar(x)));
  return e ? { etapa: e } : { etapa: null, aviso: { clave: 'etapaNoExiste', valor: v } };
}

export function leerLineas(texto: string, miembros: MiembroParaParse[], hoy: Date): Borrador[] {
  return texto.split(/\r?\n/).map((l, i) => ({ l: l.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/, '').trim(), i }))
    .filter(({ l }) => l)
    .map(({ l, i }) => {
      const r = interpretar(l, miembros, hoy);
      const avisos: Aviso[] = r.noResueltos.map((n) => ({ clave: 'noEsDelEquipo', valor: '@' + n }));
      if (!r.titulo) avisos.push({ clave: 'sinTitulo' });
      return { linea: i + 1, titulo: r.titulo, descripcion: '', asignados: r.asignados, noResueltos: r.noResueltos, etiquetas: r.etiquetas, fechaLimite: r.fechaLimite, prioridad: r.prioridad, etapa: null, avisos, valido: !!r.titulo };
    });
}

export function leerTablaCsv(texto: string, miembros: MiembroParaParse[], etapas: string[], hoy: Date): Borrador[] {
  const [cab, ...filas] = leerCsv(texto);
  const mapa = (cab ?? []).map(columnaDe);
  return filas.map((f, i) => {
    const celda = (clave: string) => { const k = mapa.indexOf(clave); return k >= 0 ? (f[k] ?? '') : ''; };
    const avisos: Aviso[] = [];
    const asignados: string[] = []; const noResueltos: string[] = [];
    for (const nombre of separar(celda('asignados'))) {
      const m = resolverMiembro(nombre, miembros);
      if (m) { if (!asignados.includes(m.email)) asignados.push(m.email); } else { noResueltos.push(nombre); avisos.push({ clave: 'noEsDelEquipo', valor: nombre }); }
    }
    const fecha = fechaDeCelda(celda('fecha'), hoy);
    if (fecha.aviso) avisos.push(fecha.aviso);
    const et = resolverEtapa(celda('etapa'), etapas);
    if (et.aviso) avisos.push(et.aviso);
    const pri = normalizar(celda('prioridad'));
    const titulo = celda('titulo').replace(/\s+/g, ' ').trim();
    if (!titulo) avisos.push({ clave: 'sinTitulo' });
    return {
      linea: i + 2, titulo, descripcion: celda('descripcion').trim(), asignados, noResueltos,
      etiquetas: [...new Set(separar(celda('etiquetas')).map((x) => x.toLowerCase().replace(/\s+/g, '-')))],
      fechaLimite: fecha.iso, prioridad: /alta|high|urgente|urgent|critica|critical|^1$|^!+$/.test(pri) ? 'alta' : 'normal',
      etapa: et.etapa, avisos, valido: !!titulo,
    };
  });
}

/** Detecta el formato y lee. `etapas` son los nombres de etapa del equipo. */
export function leerImportacion(texto: string, miembros: MiembroParaParse[], etapas: string[], hoy: Date = dia()): ResultadoLectura {
  // Si la IA lo devolvió dentro de un bloque de código, se quita la cerca.
  const limpio = texto.replace(/^\s*```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
  if (pareceCsv(limpio)) return { formato: 'csv', borradores: leerTablaCsv(limpio, miembros, etapas, hoy) };
  return { formato: 'lineas', borradores: leerLineas(limpio, miembros, hoy) };
}

const PROMPTS: Record<Idioma, (equipo: string, personas: string, etapas: string[], hoyIso: string) => string[]> = {
  es: (equipo, personas, etapas, hoyIso) => [
    `Te adjunto mis pendientes (en cualquier formato). Conviértelos a un CSV para cargarlos en Flujo, el rastreador de pendientes del equipo «${equipo}».`,
    '',
    'Devuélveme SOLO el CSV, dentro de un bloque de código, con exactamente estos encabezados en la primera fila:',
    'titulo,responsables,fecha_limite,etiquetas,prioridad,etapa,descripcion',
    '',
    'Reglas:',
    '- Un pendiente por fila. titulo: corto, en infinitivo («Enviar propuesta a Liverpool»).',
    `- responsables: nombre de pila de quien lo hace, de esta lista del equipo: ${personas}. Varios separados por «;». Vacío si no se sabe.`,
    `- fecha_limite: en formato AAAA-MM-DD. Hoy es ${hoyIso}; si el original dice «esta semana», «el viernes» o «fin de mes», calcula la fecha. Vacío si no hay.`,
    '- etiquetas: palabras cortas en minúsculas separadas por «;», sin #. Vacío si no aplica.',
    '- prioridad: «alta» si es urgente o importante; si no, vacío.',
    `- etapa: una de: ${etapas.join(', ')}. Vacío si no se sabe (queda en ${etapas[0] ?? 'la primera'}).`,
    '- descripcion: contexto útil en una línea (enlaces, con quién, qué falta). Vacío si no hay.',
    '- Si un valor tiene comas o saltos de línea, ponlo entre comillas dobles.',
    '- No inventes pendientes ni fechas: si algo no está en mi lista, déjalo vacío.',
  ],
  en: (equipo, personas, etapas, hoyIso) => [
    `Attached are my to-dos (in any format). Convert them into a CSV to load into Flujo, the to-do tracker of the team "${equipo}".`,
    '',
    'Return ONLY the CSV, inside a code block, with exactly these headers on the first row:',
    'title,assignees,due_date,tags,priority,stage,description',
    '',
    'Rules:',
    '- One to-do per row. title: short, imperative ("Send proposal to Liverpool").',
    `- assignees: first name of the person doing it, from this team list: ${personas}. Several separated by ";". Empty if unknown.`,
    `- due_date: format YYYY-MM-DD. Today is ${hoyIso}; if the original says "this week", "Friday" or "end of month", compute the date. Empty if none.`,
    '- tags: short lowercase words separated by ";", no #. Empty if none.',
    '- priority: "high" if urgent or important; otherwise empty.',
    `- stage: one of: ${etapas.join(', ')}. Empty if unknown (defaults to ${etapas[0] ?? 'the first'}).`,
    '- description: useful context in one line (links, with whom, what is missing). Empty if none.',
    '- If a value contains commas or line breaks, wrap it in double quotes.',
    '- Do not invent to-dos or dates: if something is not in my list, leave it empty.',
  ],
  pt: (equipo, personas, etapas, hoyIso) => [
    `Em anexo estão minhas pendências (em qualquer formato). Converta-as em um CSV para carregar no Flujo, o rastreador de pendências da equipe «${equipo}».`,
    '',
    'Devolva SOMENTE o CSV, dentro de um bloco de código, com exatamente estes cabeçalhos na primeira linha:',
    'titulo,responsaveis,data_limite,etiquetas,prioridade,etapa,descricao',
    '',
    'Regras:',
    '- Uma pendência por linha. titulo: curto, no infinitivo («Enviar proposta para Liverpool»).',
    `- responsaveis: primeiro nome de quem faz, desta lista da equipe: ${personas}. Vários separados por «;». Vazio se não souber.`,
    `- data_limite: no formato AAAA-MM-DD. Hoje é ${hoyIso}; se o original diz «esta semana», «sexta» ou «fim do mês», calcule a data. Vazio se não houver.`,
    '- etiquetas: palavras curtas em minúsculas separadas por «;», sem #. Vazio se não se aplica.',
    '- prioridade: «alta» se for urgente ou importante; senão, vazio.',
    `- etapa: uma de: ${etapas.join(', ')}. Vazio se não souber (fica em ${etapas[0] ?? 'a primeira'}).`,
    '- descricao: contexto útil em uma linha (links, com quem, o que falta). Vazio se não houver.',
    '- Se um valor tiver vírgulas ou quebras de linha, coloque entre aspas duplas.',
    '- Não invente pendências nem datas: se algo não está na minha lista, deixe vazio.',
  ],
};

/** El encargo que se le pega a la IA junto con el archivo de pendientes, en el idioma de quien lo copia. */
export function promptParaIA(equipo: string, miembros: MiembroParaParse[], etapas: string[], hoy: Date = dia(), idioma: Idioma = 'es'): string {
  return PROMPTS[idioma](equipo, miembros.map((m) => m.nombre).join(', '), etapas, aIso(dia(hoy))).join('\n');
}
