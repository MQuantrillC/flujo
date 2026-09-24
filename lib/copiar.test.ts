import { describe, it, expect } from 'vitest';
import { etapaEquivalente, seleccionar } from './copiar';
import type { Etapa } from './modelo';

const et = (id: string, nombre: string, esFinal = false): Etapa => ({ id, equipoId: 'x', nombre, posicion: 0, esFinal });
const T = [
  { id: 'a', etapaId: 'p', asignados: ['yo@x.com'], etiquetas: ['ifrs'] },
  { id: 'b', etapaId: 'p', asignados: ['otro@x.com'], etiquetas: ['ifrs', 'ppt'] },
  { id: 'c', etapaId: 'h', asignados: ['yo@x.com'], etiquetas: ['ifrs'] },
  { id: 'd', etapaId: 'r', asignados: [], etiquetas: [] },
];
const finales = new Set(['h']);
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('seleccionar pendientes para pasar', () => {
  it('por defecto van los abiertos; «todos» incluye los hechos', () => {
    expect(ids(seleccionar(T, finales, 'abiertos', '', 'yo@x.com'))).toEqual(['a', 'b', 'd']);
    expect(ids(seleccionar(T, finales, 'todos', '', 'yo@x.com'))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('«míos» y «etiqueta» filtran sólo entre los abiertos', () => {
    expect(ids(seleccionar(T, finales, 'mios', '', 'yo@x.com'))).toEqual(['a']);
    expect(ids(seleccionar(T, finales, 'etiqueta', 'ifrs', 'yo@x.com'))).toEqual(['a', 'b']);
    expect(ids(seleccionar(T, finales, 'etiqueta', '', 'yo@x.com'))).toEqual([]);
  });
});

describe('etapa equivalente en el otro equipo', () => {
  const destino = [et('d1', 'Por hacer'), et('d2', 'En Revisión'), et('d3', 'Listo', true)];
  it('empareja por nombre sin importar mayúsculas ni tildes', () => {
    expect(etapaEquivalente(et('o', 'en revision'), destino).id).toBe('d2');
  });
  it('sin nombre igual: «hecho» va a «hecho», lo demás a la primera abierta', () => {
    expect(etapaEquivalente(et('o', 'Hecho', true), destino).id).toBe('d3');
    expect(etapaEquivalente(et('o', 'Bloqueado'), destino).id).toBe('d1');
  });
});
