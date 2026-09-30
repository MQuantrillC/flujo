import { describe, expect, it } from 'vitest';
import { correoAviso, destinatarios, type DatosAviso } from './avisos';

const base = { autor: 'yo@x', silenciados: new Set<string>(), conCuenta: new Set(['yo@x', 'ana@x', 'beto@x']) };

describe('a quién se avisa', () => {
  it('al crear: a los asignados, menos a quien lo creó', () => {
    const r = destinatarios([{ tipo: 'creada', detalle: { asignados: ['ana@x', 'yo@x'] } }], { ...base, asignados: ['ana@x', 'yo@x'] });
    expect(r).toEqual([{ email: 'ana@x', motivo: 'asignado' }]);
  });

  it('un pendiente creado sin otros responsables no avisa a nadie', () => {
    expect(destinatarios([{ tipo: 'creada', detalle: { asignados: ['yo@x'] } }], { ...base, asignados: ['yo@x'] })).toEqual([]);
  });

  it('al sumar un responsable: al nuevo «te asignó», a los que ya estaban «cambio»', () => {
    const r = destinatarios([{ tipo: 'asignados', detalle: { de: ['ana@x'], a: ['ana@x', 'beto@x'] } }, { tipo: 'fecha', detalle: { de: null, a: '2026-10-02' } }], { ...base, asignados: ['ana@x', 'beto@x'] });
    expect(r).toEqual([{ email: 'ana@x', motivo: 'cambio' }, { email: 'beto@x', motivo: 'asignado' }]);
  });

  it('un comentario manda sobre un cambio', () => {
    const r = destinatarios([{ tipo: 'comentario', detalle: {} }, { tipo: 'adjunto', detalle: { nombre: 'a.pdf' } }], { ...base, asignados: ['ana@x'] });
    expect(r).toEqual([{ email: 'ana@x', motivo: 'comentario' }]);
  });

  it('quien apagó los avisos, quien no tiene cuenta y quien dejó de ser responsable no reciben nada', () => {
    const ev = [{ tipo: 'etapa' as const, detalle: { de: 'Pendiente', a: 'En curso' } }];
    expect(destinatarios(ev, { ...base, asignados: ['ana@x', 'nueva@x'], silenciados: new Set(['ana@x']) })).toEqual([]);
    expect(destinatarios([{ tipo: 'asignados', detalle: { de: ['ana@x'], a: [] } }], { ...base, asignados: [] })).toEqual([]);
  });

  it('sin eventos, nada', () => expect(destinatarios([], { ...base, asignados: ['ana@x'] })).toEqual([]));
});

describe('el correo', () => {
  const d: DatosAviso = {
    asunto: 'Marco comentó en: Enviar <propuesta>', titulo: 'Marco comentó en un pendiente tuyo', equipo: 'En el equipo Ventas',
    pendiente: 'Enviar <propuesta>', meta: ['En curso', 'vence vie 2 oct'], lineas: ['Fecha límite: sin fecha → vie 2 oct'],
    comentario: { rotulo: 'Marco escribió:', texto: 'Hola\n<b>ojo</b>' }, boton: 'Ver el pendiente', oEnlace: 'Si el botón no funciona…',
    pie: 'Te llegó porque eres responsable.', apagar: 'Apagar estos avisos', firma: 'Flujo',
  };
  const c = correoAviso(d, 'https://f.x/e/1/t/2', 'https://f.x/e/1/ajustes', 'https://f.x/apple-icon.png');

  it('escapa lo que escribió la gente y lleva los dos enlaces', () => {
    expect(c.html).toContain('Enviar &lt;propuesta&gt;');
    expect(c.html).toContain('Hola<br>&lt;b&gt;ojo&lt;/b&gt;');
    expect(c.html).not.toContain('<b>ojo</b>');
    expect(c.html).toContain('href="https://f.x/e/1/t/2"');
    expect(c.html).toContain('href="https://f.x/e/1/ajustes"');
  });

  it('el texto plano tiene lo mismo', () => {
    expect(c.texto).toContain('Ver el pendiente: https://f.x/e/1/t/2');
    expect(c.texto).toContain('· Fecha límite: sin fecha → vie 2 oct');
    expect(c.texto).toContain('Apagar estos avisos: https://f.x/e/1/ajustes');
  });

  it('un comentario muy largo se corta', () => {
    const largo = correoAviso({ ...d, comentario: { rotulo: 'x', texto: 'a'.repeat(900) } }, 'u', 'v', 'i');
    expect(largo.texto).toContain('a'.repeat(600) + '…');
    expect(largo.texto).not.toContain('a'.repeat(601));
  });
});
