import { describe, it, expect } from 'vitest';
import { nombresCortos } from './nombres';

describe('nombresCortos', () => {
  it('con nombres distintos, sólo el nombre de pila', () => {
    expect(nombresCortos([{ email: 'a@x', nombre: 'Marco Quantrill' }, { email: 'b@x', nombre: 'Andrea Velarde' }])).toEqual({ 'a@x': 'Marco', 'b@x': 'Andrea' });
  });

  it('dos Marcos: se añade la inicial del apellido', () => {
    const r = nombresCortos([{ email: 'a@x', nombre: 'Marco Quantrill' }, { email: 'b@x', nombre: 'marco velarde' }, { email: 'c@x', nombre: 'Harold Suarez' }]);
    expect(r).toEqual({ 'a@x': 'Marco Q', 'b@x': 'marco V', 'c@x': 'Harold' });
  });

  it('misma inicial: el nombre entero; y si es igual, el correo', () => {
    const r = nombresCortos([{ email: 'a@x', nombre: 'Marco Quantrill' }, { email: 'b@x', nombre: 'Marco Quiroga' }, { email: 'c@x', nombre: 'Marco Quantrill' }]);
    expect(r).toEqual({ 'a@x': 'a@x', 'b@x': 'Marco Quiroga', 'c@x': 'c@x' });
  });

  it('uno sin apellido frente a otro con apellido', () => {
    expect(nombresCortos([{ email: 'a@x', nombre: 'Marco' }, { email: 'b@x', nombre: 'Marco Quantrill' }])).toEqual({ 'a@x': 'Marco', 'b@x': 'Marco Q' });
  });
});
