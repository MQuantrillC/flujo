import { describe, expect, it } from 'vitest';
import { etiquetaEnlace, extraerEnlaces, normalizarEnlace, partirEnlaces } from './enlaces';

describe('extraerEnlaces', () => {
  it('saca las direcciones y les quita la puntuación pegada', () => {
    expect(extraerEnlaces('ver https://docs.google.com/d/abc, y https://github.com/x/y.')).toEqual(['https://docs.google.com/d/abc', 'https://github.com/x/y']);
  });
  it('acepta www. sin esquema y no repite', () => {
    expect(extraerEnlaces('www.xertica.com y www.xertica.com')).toEqual(['https://www.xertica.com']);
  });
  it('conserva un paréntesis que abre dentro del enlace', () => {
    expect(normalizarEnlace('https://es.wikipedia.org/wiki/Flujo_(f%C3%ADsica)')).toBe('https://es.wikipedia.org/wiki/Flujo_(f%C3%ADsica)');
    expect(normalizarEnlace('https://x.com/a)')).toBe('https://x.com/a');
  });
});

describe('etiquetaEnlace', () => {
  it('nombra los servicios conocidos', () => {
    expect(etiquetaEnlace('https://docs.google.com/document/d/1')).toBe('Google Docs');
    expect(etiquetaEnlace('https://xertica.lightning.force.com/lightning/r/Opportunity/1')).toBe('Salesforce');
    expect(etiquetaEnlace('https://xertica.atlassian.net/browse/AP-1')).toBe('Jira');
  });
  it('si no lo conoce, usa el dominio sin www', () => {
    expect(etiquetaEnlace('https://www.ejemplo.pe/ruta')).toBe('ejemplo.pe');
  });
});

describe('partirEnlaces', () => {
  it('separa texto y enlaces sin perder nada', () => {
    const trozos = partirEnlaces('mira https://a.com/x. listo');
    expect(trozos).toEqual([
      { tipo: 'texto', valor: 'mira ' },
      { tipo: 'enlace', valor: 'https://a.com/x', url: 'https://a.com/x' },
      { tipo: 'texto', valor: '. listo' },
    ]);
  });
});
