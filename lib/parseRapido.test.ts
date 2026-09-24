import { describe, it, expect } from 'vitest';
import { interpretar, resolverMiembro } from './parseRapido';
import { fechaCorta, haceCuanto, viernesDeLaSemana, viernesProximaSemana } from './fechas';

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

  it.each([
    ['send proposal today', '2026-09-23'],
    ['send proposal tomorrow', '2026-09-24'],
    ['send proposal this week', '2026-09-25'],
    ['send proposal next week', '2026-10-02'],
    ['send proposal by end of month', '2026-09-30'],
    ['send proposal in 3 days', '2026-09-26'],
    ['send proposal on monday', '2026-09-28'],
    ['send proposal oct 15', '2026-10-15'],
    ['send proposal october 15th, 2026', '2026-10-15'],
    ['send proposal 15 oct', '2026-10-15'],
  ])('in English: «%s» → %s', (texto, esperado) => {
    const r = interpretar(texto, equipo, hoy);
    expect(r.fechaLimite).toBe(esperado);
    expect(r.titulo).toBe('Send proposal');
  });

  it.each([
    ['enviar proposta hoje', '2026-09-23'],
    ['enviar proposta amanhã', '2026-09-24'],
    ['enviar proposta esta semana', '2026-09-25'],
    ['enviar proposta semana que vem', '2026-10-02'],
    ['enviar proposta até o fim do mês', '2026-09-30'],
    ['enviar proposta em 3 dias', '2026-09-26'],
    ['enviar proposta na segunda-feira', '2026-09-28'],
    ['enviar proposta 15 out', '2026-10-15'],
  ])('em português: «%s» → %s', (texto, esperado) => {
    const r = interpretar(texto, equipo, hoy);
    expect(r.fechaLimite).toBe(esperado);
    expect(r.titulo).toBe('Enviar proposta');
  });

  it('sin fecha, sin fecha', () => {
    const r = interpretar('ordenar el drive del equipo', equipo, hoy);
    expect(r.fechaLimite).toBeNull();
    expect(r.titulo).toBe('Ordenar el drive del equipo');
  });

  it('una ruta con barras no se confunde con una fecha, ni «may» dentro de una frase', () => {
    expect(interpretar('revisar /master/insights', equipo, hoy).fechaLimite).toBeNull();
    expect(interpretar('we may need a new demo', equipo, hoy).fechaLimite).toBeNull();
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

describe('fechas cortas en tres idiomas', () => {
  it('hoy, mañana, ayer y el resto con día de semana', () => {
    expect(fechaCorta('2026-09-23', hoy)).toBe('hoy');
    expect(fechaCorta('2026-09-24', hoy)).toBe('mañana');
    expect(fechaCorta('2026-09-22', hoy)).toBe('ayer');
    expect(fechaCorta('2026-09-25', hoy)).toBe('vie 25 sep');
    expect(fechaCorta('2027-01-05', hoy)).toBe('mar 5 ene 2027');
    expect(fechaCorta('2026-09-25', hoy, 'en')).toBe('Fri Sep 25');
    expect(fechaCorta('2026-09-24', hoy, 'en')).toBe('tomorrow');
    expect(fechaCorta('2026-09-25', hoy, 'pt')).toBe('sex 25 set');
    expect(fechaCorta('2026-09-23', hoy, 'pt')).toBe('hoje');
  });
  it('hace cuánto', () => {
    const ahora = hoy.getTime();
    expect(haceCuanto(ahora - 5 * 60_000, ahora)).toBe('hace 5 min');
    expect(haceCuanto(ahora - 3 * 3_600_000, ahora, 'en')).toBe('3 h ago');
    expect(haceCuanto(ahora - 30_000, ahora, 'pt')).toBe('agora');
  });
});

describe('enlaces en la línea', () => {
  it('saca la dirección del título y la guarda aparte', () => {
    const r = interpretar('@harold revisar https://docs.google.com/d/abc#seccion esta semana #insights', equipo, hoy);
    expect(r.titulo).toBe('Revisar');
    expect(r.enlaces).toEqual(['https://docs.google.com/d/abc#seccion']);
    expect(r.etiquetas).toEqual(['insights']);
    expect(r.asignados).toEqual(['harold.suarez@xertica.com']);
  });
  it('sin dirección, la lista queda vacía', () => {
    expect(interpretar('llamar al proveedor', [], hoy).enlaces).toEqual([]);
  });
});
