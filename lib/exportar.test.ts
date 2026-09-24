import { describe, it, expect } from 'vitest';
import { aCsv, aJson, aMarkdown, fechaHora, nombreArchivo, type DatosExportacion, type Rotulos } from './exportar';
import { leerImportacion } from './importar';

const R: Rotulos = {
  titulo: 'Pendientes de {equipo}', exportado: 'Exportado el', etapas: 'Etapas', miembros: 'Miembros', hecho: 'hecho', sinResponsable: 'sin responsable',
  responsables: 'Responsables', correos: 'Correos', vence: 'Vence', prioridad: 'Prioridad', alta: 'alta', normal: 'normal', etiquetas: 'Etiquetas',
  descripcion: 'Descripción', enlaces: 'Enlaces', creadoPor: 'Creado por', creadoEn: 'Creado', terminadoEn: 'Terminado', comentarios: 'Comentarios',
  estado: 'Estado', abierto: 'abierto', id: 'Id',
};

const D: DatosExportacion = {
  equipo: { id: 'e1', nombre: 'Equipo Comercial', creadoPor: 'marco@x.com', creadoEn: 0, personal: false },
  etapas: [{ id: 'p', equipoId: 'e1', nombre: 'Pendiente', posicion: 0, esFinal: false }, { id: 'h', equipoId: 'e1', nombre: 'Hecho', posicion: 1, esFinal: true }],
  miembros: [{ email: 'marco@x.com', nombre: 'Marco Quantrill', nombrePila: 'Marco', apellido: 'Quantrill', cumpleanos: null, tieneCuenta: true }],
  tareas: [
    { id: 't1', equipoId: 'e1', titulo: 'Enviar propuesta, "la buena"', descripcion: 'Con Andrea\nsegunda línea', etapaId: 'p', fechaLimite: '2026-09-30', prioridad: 'alta', creadoPor: 'marco@x.com', creadoEn: Date.UTC(2026, 8, 24, 15, 0), actualizadoEn: 0, terminadoEn: null, asignados: ['marco@x.com', 'ana@x.com'], etiquetas: ['ventas', 'gcp'], enlaces: [{ url: 'https://docs.google.com/x', nombre: 'Propuesta' }], comentarios: 1, adjuntos: 0 },
    { id: 't2', equipoId: 'e1', titulo: 'Ordenar el drive', descripcion: '', etapaId: 'h', fechaLimite: null, prioridad: 'normal', creadoPor: 'marco@x.com', creadoEn: 0, actualizadoEn: 0, terminadoEn: Date.UTC(2026, 8, 24, 3, 30), asignados: [], etiquetas: [], enlaces: [], comentarios: 0, adjuntos: 0 },
  ],
  comentarios: { t1: [{ id: 'c1', tareaId: 't1', autor: 'marco@x.com', texto: 'Falta el precio', creadoEn: Date.UTC(2026, 8, 24, 16, 0), adjuntos: [] }] },
  zona: 'America/Lima',
  ahora: new Date(Date.UTC(2026, 8, 24, 20, 0)),
};

describe('exportar', () => {
  it('escribe las horas en la zona del usuario', () => {
    expect(fechaHora(Date.UTC(2026, 8, 24, 3, 30), 'America/Lima')).toBe('2026-09-23 22:30');
    expect(fechaHora(null, 'America/Lima')).toBe('');
  });

  it('el CSV escapa comillas y saltos, y se puede volver a importar', () => {
    const csv = aCsv(D, R);
    expect(csv.startsWith('﻿titulo,etapa,responsables')).toBe(true);
    expect(csv).toContain('"Enviar propuesta, ""la buena"""');
    expect(csv).toContain('"Con Andrea\nsegunda línea"');
    const r = leerImportacion(csv, [{ email: 'marco@x.com', nombre: 'Marco Quantrill' }], ['Pendiente', 'Hecho'], new Date(2026, 8, 24));
    expect(r.formato).toBe('csv');
    expect(r.borradores[0]).toMatchObject({ titulo: 'Enviar propuesta, "la buena"', etapa: 'Pendiente', fechaLimite: '2026-09-30', prioridad: 'alta', etiquetas: ['ventas', 'gcp'], asignados: ['marco@x.com'] });
    expect(r.borradores[1]).toMatchObject({ titulo: 'Ordenar el drive', etapa: 'Hecho' });
  });

  it('el JSON trae comentarios, responsables con nombre y la etapa resuelta', () => {
    const j = JSON.parse(aJson(D));
    expect(j.equipo).toBe('Equipo Comercial');
    expect(j.pendientes).toHaveLength(2);
    expect(j.pendientes[0]).toMatchObject({ etapa: 'Pendiente', hecho: false, responsables: [{ nombre: 'Marco Quantrill', email: 'marco@x.com' }, { nombre: 'ana@x.com', email: 'ana@x.com' }] });
    expect(j.pendientes[0].comentarios[0]).toMatchObject({ texto: 'Falta el precio', fecha: '2026-09-24 11:00' });
    expect(j.pendientes[1]).toMatchObject({ hecho: true, terminadoEn: '2026-09-23 22:30' });
  });

  it('el Markdown agrupa por etapa y lista lo que hay, sin renglones vacíos', () => {
    const md = aMarkdown(D, R);
    expect(md).toContain('# Pendientes de Equipo Comercial');
    expect(md).toContain('Etapas: Pendiente → Hecho (hecho).');
    expect(md).toContain('## Pendiente (1)');
    expect(md).toContain('### ⚑ Enviar propuesta, "la buena"');
    expect(md).toContain('- Enlaces: [Propuesta](https://docs.google.com/x)');
    expect(md).toContain('- 2026-09-24 11:00 · Marco Quantrill: Falta el precio');
    expect(md).toContain('## Hecho (1)');
    expect(md).toContain('- Responsables: sin responsable');
    expect(md).not.toContain('- Vence: \n');
  });

  it('el nombre del archivo lleva el equipo y la fecha', () => {
    expect(nombreArchivo('Equipo Comercial · México', D.ahora, D.zona)).toBe('flujo-equipo-comercial-mexico-2026-09-24');
  });
});
