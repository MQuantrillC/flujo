import { describe, it, expect } from 'vitest';
import { leerImportacion, leerCsv, fechaDeCelda, promptParaIA } from './importar';

const equipo = [
  { email: 'marco.quantrill@xertica.com', nombre: 'Marco Quantrill' },
  { email: 'andrea.velarde@xertica.com', nombre: 'Andrea Velarde' },
  { email: 'harold.suarez@xertica.com', nombre: 'Harold Suárez' },
];
const etapas = ['Pendiente', 'En curso', 'En revisión', 'Hecho'];
const hoy = new Date(2026, 8, 23, 12); // miércoles

describe('importar un CSV', () => {
  const csv = `titulo,responsables,fecha_limite,etiquetas,prioridad,etapa,descripcion
Enviar propuesta a Liverpool,Marco,2026-09-30,ventas;gcp,alta,En curso,"Falta el precio final, revisar con Andrea"
Revisar /master/insights,Harold;Andrea,esta semana,insights,,,
,Marco,,,,,
Ordenar el drive,Pedro,15/10/2026,,,Bloqueado,`;

  it('lee columnas, personas, fechas, etiquetas, prioridad y etapa', () => {
    const r = leerImportacion(csv, equipo, etapas, hoy);
    expect(r.formato).toBe('csv');
    expect(r.borradores).toHaveLength(4);
    expect(r.borradores[0]).toMatchObject({
      titulo: 'Enviar propuesta a Liverpool', asignados: ['marco.quantrill@xertica.com'], fechaLimite: '2026-09-30',
      etiquetas: ['ventas', 'gcp'], prioridad: 'alta', etapa: 'En curso', descripcion: 'Falta el precio final, revisar con Andrea', valido: true, avisos: [],
    });
    expect(r.borradores[1]).toMatchObject({ asignados: ['harold.suarez@xertica.com', 'andrea.velarde@xertica.com'], fechaLimite: '2026-09-25', etapa: null });
  });

  it('avisa lo que no puede resolver y marca inválida la fila sin título', () => {
    const r = leerImportacion(csv, equipo, etapas, hoy);
    expect(r.borradores[2].valido).toBe(false);
    expect(r.borradores[2].avisos).toContain('Sin título');
    expect(r.borradores[3].valido).toBe(true);
    expect(r.borradores[3].fechaLimite).toBe('2026-10-15');
    expect(r.borradores[3].avisos).toEqual(['«Pedro» no es de este equipo', 'La etapa «Bloqueado» no existe; va a la primera']);
  });

  it('acepta encabezados en inglés, punto y coma, y un bloque de código alrededor', () => {
    const r = leerImportacion('```csv\nTitle;Assignee;Due date\nLlamar al cliente;andrea;2026-10-01\n```', equipo, etapas, hoy);
    expect(r.formato).toBe('csv');
    expect(r.borradores[0]).toMatchObject({ titulo: 'Llamar al cliente', asignados: ['andrea.velarde@xertica.com'], fechaLimite: '2026-10-01' });
  });
});

describe('importar una lista de líneas', () => {
  it('cada línea es una línea rápida, con o sin viñeta', () => {
    const r = leerImportacion('- @harold revisar /master/insights esta semana #insights\n* preparar demo el lunes !\n[ ] @pedro algo\n\n3. sin fecha', equipo, etapas, hoy);
    expect(r.formato).toBe('lineas');
    expect(r.borradores.map((b) => b.titulo)).toEqual(['Revisar /master/insights', 'Preparar demo', 'Algo', 'Sin fecha']);
    expect(r.borradores[0]).toMatchObject({ asignados: ['harold.suarez@xertica.com'], fechaLimite: '2026-09-25', etiquetas: ['insights'], linea: 1 });
    expect(r.borradores[1].prioridad).toBe('alta');
    expect(r.borradores[2].avisos).toEqual(['@pedro no es de este equipo']);
    expect(r.borradores[3].linea).toBe(5);
  });
});

describe('piezas', () => {
  it('el CSV entiende comillas y saltos de línea dentro de una celda', () => {
    expect(leerCsv('a,b\n"x, y","línea 1\nlínea 2"')).toEqual([['a', 'b'], ['x, y', 'línea 1\nlínea 2']]);
  });
  it('las fechas de celda: ISO, día/mes/año y frases', () => {
    expect(fechaDeCelda('2026-10-15', hoy).iso).toBe('2026-10-15');
    expect(fechaDeCelda('15/10/2026', hoy).iso).toBe('2026-10-15');
    expect(fechaDeCelda('el viernes', hoy).iso).toBe('2026-09-25');
    expect(fechaDeCelda('cuando se pueda', hoy)).toEqual({ iso: null, aviso: 'No entendí la fecha «cuando se pueda»' });
  });
  it('el encargo para la IA nombra al equipo, la fecha de hoy y las etapas', () => {
    const p = promptParaIA('Equipo Marco', equipo, etapas, hoy);
    expect(p).toContain('titulo,responsables,fecha_limite,etiquetas,prioridad,etapa,descripcion');
    expect(p).toContain('Marco Quantrill, Andrea Velarde, Harold Suárez');
    expect(p).toContain('Hoy es 2026-09-23');
    expect(p).toContain('Pendiente, En curso, En revisión, Hecho');
  });
});
