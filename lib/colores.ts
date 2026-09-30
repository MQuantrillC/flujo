// ──────────────────────────────────────────────────────────────────────────────
// COLORES POR PERSONA — cada miembro de un equipo puede tener un color, si
// alguien se lo elige en Ajustes. Es opcional: sin color, la tarjeta se ve como
// siempre.
//
// La tarjeta no se pinta con el color, sólo se tiñe (≈10 % sobre el fondo) y
// lleva una franja fina a la izquierda: así el texto, las etiquetas, la fecha y
// el desplegable de etapa se leen igual que sin color, en claro y en oscuro.
// Por eso la paleta es cerrada y de tonos medios: un color elegido a mano
// (amarillo chillón, negro) no pasaría esa prueba. Sin rojo a propósito: el
// rojo ya significa «prioridad alta» y «vencido».
// ──────────────────────────────────────────────────────────────────────────────

import type { Tarea } from './modelo';

export const COLORES_PERSONA = {
  azul: '#3b82f6',
  turquesa: '#14b8a6',
  verde: '#22c55e',
  lima: '#84cc16',
  ambar: '#f59e0b',
  naranja: '#f97316',
  rosa: '#ec4899',
  violeta: '#8b5cf6',
} as const;

export type ColorPersona = keyof typeof COLORES_PERSONA;

export const esColorPersona = (c: unknown): c is ColorPersona => typeof c === 'string' && Object.hasOwn(COLORES_PERSONA, c);

/** La clave de un color en un mapa que mezcla equipos: el mismo correo puede tener otro color en otro equipo. */
export const claveColor = (equipoId: string, email: string) => `${equipoId}|${email}`;

/**
 * Los colores de una tarjeta: los de sus responsables que tienen uno, en el
 * orden en que están asignados y sin repetir. Vacío = la tarjeta va sin color.
 */
export function coloresDeTarea(t: Pick<Tarea, 'equipoId' | 'asignados'>, colores: Record<string, string>): string[] {
  const vistos: string[] = [];
  for (const email of t.asignados) {
    const c = colores[claveColor(t.equipoId, email)];
    if (esColorPersona(c)) { const hex = COLORES_PERSONA[c]; if (!vistos.includes(hex)) vistos.push(hex); }
  }
  return vistos;
}

/**
 * La franja de la izquierda: un color entero, o varios en tramos iguales de
 * arriba abajo si el pendiente es de varias personas con color. Siempre es un
 * degradado (una imagen): un color suelto como capa de fondo no respeta el
 * tamaño de 4 px y pintaría la tarjeta entera.
 */
export function franja(hexes: string[]): string {
  if (!hexes.length) return 'none';
  if (hexes.length === 1) return `linear-gradient(${hexes[0]}, ${hexes[0]})`;
  const paso = 100 / hexes.length;
  return `linear-gradient(${hexes.map((h, i) => `${h} ${(i * paso).toFixed(2)}% ${((i + 1) * paso).toFixed(2)}%`).join(', ')})`;
}
