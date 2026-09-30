import { describe, expect, it } from 'vitest';
import { COLORES_PERSONA, claveColor, coloresDeTarea, esColorPersona, franja } from './colores';

describe('colores por persona', () => {
  const colores = { [claveColor('e1', 'ana@x.com')]: 'azul', [claveColor('e1', 'beto@x.com')]: 'verde', [claveColor('e2', 'ana@x.com')]: 'rosa', [claveColor('e1', 'caro@x.com')]: 'fucsia' };

  it('sólo acepta los de la paleta', () => {
    expect(esColorPersona('azul')).toBe(true);
    expect(esColorPersona('fucsia')).toBe(false);
    expect(esColorPersona('toString')).toBe(false);
    expect(esColorPersona(null)).toBe(false);
  });

  it('toma los de los responsables, en orden, sin repetir y por equipo', () => {
    expect(coloresDeTarea({ equipoId: 'e1', asignados: ['beto@x.com', 'ana@x.com'] }, colores)).toEqual([COLORES_PERSONA.verde, COLORES_PERSONA.azul]);
    expect(coloresDeTarea({ equipoId: 'e2', asignados: ['ana@x.com'] }, colores)).toEqual([COLORES_PERSONA.rosa]);
  });

  it('sin responsables con color, sin color (y un valor que no es de la paleta no cuenta)', () => {
    expect(coloresDeTarea({ equipoId: 'e1', asignados: [] }, colores)).toEqual([]);
    expect(coloresDeTarea({ equipoId: 'e1', asignados: ['caro@x.com', 'dani@x.com'] }, colores)).toEqual([]);
  });

  it('la franja: un color entero o tramos iguales', () => {
    expect(franja(['#111111'])).toBe('linear-gradient(#111111, #111111)');
    expect(franja(['#111111', '#222222'])).toBe('linear-gradient(#111111 0.00% 50.00%, #222222 50.00% 100.00%)');
    expect(franja([])).toBe('none');
  });
});
