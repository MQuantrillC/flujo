import { describe, expect, it } from 'vitest';
import { hoyEn, zonaValida } from './zona';
import { aIso } from './fechas';

describe('hoyEn', () => {
  // 2026-09-24 03:58 UTC: en Lima todavía es el 23 a las 22:58; en Madrid ya es el 24.
  const instante = new Date(Date.UTC(2026, 8, 24, 3, 58));
  it('da el día de la zona del usuario, no el del servidor', () => {
    expect(aIso(hoyEn('America/Lima', instante))).toBe('2026-09-23');
    expect(aIso(hoyEn('America/Mexico_City', instante))).toBe('2026-09-23');
    expect(aIso(hoyEn('Europe/Madrid', instante))).toBe('2026-09-24');
  });
  it('con una zona inválida usa la del equipo', () => {
    expect(aIso(hoyEn('Marte/Olympus', instante))).toBe('2026-09-23');
  });
});

describe('zonaValida', () => {
  it('acepta zonas reales y rechaza basura', () => {
    expect(zonaValida('America/Lima')).toBe(true);
    expect(zonaValida('UTC')).toBe(true);
    expect(zonaValida('')).toBe(false);
    expect(zonaValida('x/y')).toBe(false);
    expect(zonaValida(42)).toBe(false);
  });
});
