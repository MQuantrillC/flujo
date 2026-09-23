import { describe, it, expect } from 'vitest';
import { interpretar, resolverMiembro } from './parseRapido';
import { fechaCorta, viernesDeLaSemana, viernesProximaSemana } from './fechas';

const equipo = [
  { email: 'marco.quantrill@xertica.com', nombre: 'Marco Quantrill' },
  { email: 'andrea.velarde@xertica.com', nombre: 'Andrea Velarde' },
  { email: 'harold.suarez@xertica.com', nombre: 'Harold Suárez' },
];
// Miércoles 23 de septiembre de 2026.
const hoy = new Date(2026, 8, 23, 10, 30);

describe('la línea rápida', () => {
  it('el ejemplo de Marco: responsable, título y viernes de esta semana', () => {
    const r = interpretar('@harold revisar /master/insights esta semana', equipo, hoy);
    expect(r).toMatchObject({ titulo: 'Revisar /master/insights', asignados: ['harold.suarez@xertica.com'], fechaLimite: '2026-09-25', fechaTexto: 'esta semana', prioridad: 'normal' });
  });

  it('varios responsables, etiquetas y prioridad', () => {
    const r = interpretar('@andrea @Harold preparar demo #ventas #q4 !', equipo, hoy);
    expect(r.asignados).toEqual(['andrea.velarde@xertica.com', 'harold.suarez@xertica.com']);
    expect(r.etiquetas).toEqual(['ventas', 'q4']);
    expect(r.prioridad).toBe('alta');
    expect(r.titulo).toBe('Preparar demo');
  });

  it('un @ que no es de nadie se avisa y no rompe el título', () => {
    const r = interpretar('@pedro llamar al cliente mañana', equipo, hoy);
    expect(r.noResueltos).toEqual(['pedro']);
    expect(r.asignados).toEqual([]);
    expect(r.titulo).toBe('Llamar al cliente');
    expect(r.fechaLimite).toBe('2026-09-24');
  });

  it.each([
    ['enviar propuesta hoy', '2026-09-23'],
    ['enviar propuesta para mañana', '2026-09-24'],
    ['enviar propuesta pasado mañana', '2026-09-25'],
    ['enviar propuesta la próxima semana', '2026-10-02'],
    ['enviar propuesta fin de mes', '2026-09-30'],
    ['enviar propuesta en 3 días', '2026-09-26'],
    ['enviar propuesta en dos semanas', '2026-10-07'],
    ['enviar propuesta el lunes', '2026-09-28'],
    ['enviar propuesta antes del viernes', '2026-09-25'],
    ['enviar propuesta el miércoles', '2026-09-23'],
    ['enviar propuesta 15 oct', '2026-10-15'],
    ['enviar propuesta el 15 de octubre', '2026-10-15'],
    ['enviar propuesta 15/10', '2026-10-15'],
    ['enviar propuesta 2026-11-02', '2026-11-02'],
    ['enviar propuesta 5 ene', '2027-01-05'],
  ])('«%s» → %s', (texto, esperado) => {
    const r = interpretar(texto, equipo, hoy);
    expect(r.fechaLimite).toBe(esperado);
    expect(r.titulo).toBe('Enviar propuesta');
  });

  it('sin fecha, sin fecha', () => {
    const r = interpretar('ordenar el drive del equipo', equipo, hoy);
    expect(r.fechaLimite).toBeNull();
    expect(r.titulo).toBe('Ordenar el drive del equipo');
  });

  it('una ruta con barras no se confunde con una fecha', () => {
    expect(interpretar('revisar /master/insights', equipo, hoy).fechaLimite).toBeNull();
  });

  it('en fin de semana, «esta semana» es el viernes que viene y «la próxima» también', () => {
    const sabado = new Date(2026, 8, 26, 12);
    expect(interpretar('x esta semana', equipo, sabado).fechaLimite).toBe('2026-10-02');
    expect(interpretar('x la próxima semana', equipo, sabado).fechaLimite).toBe('2026-10-02');
    expect(viernesDeLaSemana(sabado).getDate()).toBe(2);
    expect(viernesProximaSemana(new Date(2026, 8, 25, 12)).getDate()).toBe(2);
  });
});

describe('resolver un @', () => {
  it('por nombre, por correo, por nombre y apellido juntos, sin acentos', () => {
    expect(resolverMiembro('harold', equipo)?.email).toBe('harold.suarez@xertica.com');
    expect(resolverMiembro('harold.suarez', equipo)?.email).toBe('harold.suarez@xertica.com');
    expect(resolverMiembro('HaroldSuarez', equipo)?.email).toBe('harold.suarez@xertica.com');
    expect(resolverMiembro('and', equipo)?.email).toBe('andrea.velarde@xertica.com');
    expect(resolverMiembro('nadie', equipo)).toBeNull();
  });
});

describe('fechas cortas', () => {
  it('hoy, mañana, ayer y el resto con día de semana', () => {
    expect(fechaCorta('2026-09-23', hoy)).toBe('hoy');
    expect(fechaCorta('2026-09-24', hoy)).toBe('mañana');
    expect(fechaCorta('2026-09-22', hoy)).toBe('ayer');
    expect(fechaCorta('2026-09-25', hoy)).toBe('vie 25 sep');
    expect(fechaCorta('2027-01-05', hoy)).toBe('mar 5 ene 2027');
  });
});
