import { describe, it, expect } from 'vitest';
import { agruparPorPlazo, agruparSemana, agruparPorPersona, etiquetasEnUso } from './vistas';
import type { Tarea } from './modelo';

const hoy = new Date(2026, 8, 23, 12); // miércoles
const t = (id: string, fechaLimite: string | null, extra: Partial<Tarea> = {}): Tarea => ({
  id, equipoId: 'e', titulo: id, descripcion: '', etapaId: 's', fechaLimite, prioridad: 'normal', creadoPor: 'x',
  creadoEn: 1, actualizadoEn: 1, terminadoEn: null, asignados: [], etiquetas: [], comentarios: 0, adjuntos: 0, ...extra,
});

describe('agrupar por plazo', () => {
  it('reparte en vencidas, hoy, esta semana, próxima, después y sin fecha', () => {
    const g = agruparPorPlazo([t('a', '2026-09-20'), t('b', '2026-09-23'), t('c', '2026-09-25'), t('d', '2026-10-01'), t('e', '2026-11-15'), t('f', null)], hoy);
    expect(g.map((x) => [x.clave, x.tareas.map((y) => y.id)])).toEqual([
      ['vencidas', ['a']], ['hoy', ['b']], ['estaSemana', ['c']], ['proximaSemana', ['d']], ['despues', ['e']], ['sinFecha', ['f']],
    ]);
  });
  it('dentro del mismo día, prioridad alta primero', () => {
    const g = agruparPorPlazo([t('n', '2026-09-24'), t('a', '2026-09-24', { prioridad: 'alta' })], hoy);
    expect(g[0].tareas.map((x) => x.id)).toEqual(['a', 'n']);
  });
});

describe('la semana', () => {
  it('vencidas primero, luego día por día hasta el viernes', () => {
    const g = agruparSemana([t('lejos', '2026-10-02'), t('v', '2026-09-21'), t('j', '2026-09-24'), t('m', '2026-09-23'), t('sin', null)], hoy);
    expect(g.map((x) => [x.clave, x.tareas.map((y) => y.id)])).toEqual([['vencidas', ['v']], ['2026-09-23', ['m']], ['2026-09-24', ['j']]]);
  });
});

describe('por persona', () => {
  it('una lista por miembro y otra, sin correo, para las sin responsable', () => {
    const g = agruparPorPersona([t('a', null, { asignados: ['h@x.com', 'm@x.com'] }), t('b', null)], [{ email: 'm@x.com', nombre: 'Marco' }, { email: 'h@x.com', nombre: 'Harold' }, { email: 'z@x.com', nombre: 'Nadie' }]);
    expect(g.map((x) => [x.email, x.tareas.length])).toEqual([['m@x.com', 1], ['h@x.com', 1], [null, 1]]);
  });
});

describe('etiquetas en uso', () => {
  it('cuenta y ordena', () => {
    expect(etiquetasEnUso([t('a', null, { etiquetas: ['q4'] }), t('b', null, { etiquetas: ['q4', 'demo'] })])).toEqual([{ etiqueta: 'q4', n: 2 }, { etiqueta: 'demo', n: 1 }]);
  });
});
