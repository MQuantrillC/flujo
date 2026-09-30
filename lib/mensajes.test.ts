// Los tres idiomas tienen que decir lo mismo: las mismas claves, los mismos
// huecos ({nombre}, {n}…) y nada vacío. Si falta una clave en un idioma,
// next-intl muestra la clave en pantalla («tablero.nadaAqui») y nadie lo nota
// hasta que alguien cambia de idioma.

import { describe, expect, it } from 'vitest';
import es from '../messages/es.json';
import en from '../messages/en.json';
import pt from '../messages/pt.json';

type Arbol = { [k: string]: unknown };
const aplanar = (o: Arbol, p = ''): [string, unknown][] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? aplanar(v as Arbol, `${p}${k}.`) : [[`${p}${k}`, v] as [string, unknown]]));
// Los huecos de primer nivel: {quien}, {n, plural, …}. Los de dentro de un plural (#) no cuentan.
const huecos = (v: unknown) => (typeof v === 'string' ? [...new Set([...v.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]))].sort() : Array.isArray(v) ? [`lista:${v.length}`] : []);

const IDIOMAS = { es, en, pt } as Record<string, Arbol>;
const planos = Object.fromEntries(Object.entries(IDIOMAS).map(([k, v]) => [k, Object.fromEntries(aplanar(v))]));

describe('traducciones', () => {
  for (const idioma of ['en', 'pt']) {
    it(`${idioma} tiene exactamente las claves del español`, () => {
      expect(Object.keys(planos[idioma]).sort()).toEqual(Object.keys(planos.es).sort());
    });
    it(`${idioma} usa los mismos huecos que el español en cada texto`, () => {
      const distintos = Object.keys(planos.es).filter((k) => JSON.stringify(huecos(planos.es[k])) !== JSON.stringify(huecos(planos[idioma][k])));
      expect(distintos).toEqual([]);
    });
  }
  it('ningún texto vacío', () => {
    for (const [idioma, plano] of Object.entries(planos)) {
      const vacios = Object.entries(plano).filter(([, v]) => v === '' || v === null).map(([k]) => `${idioma}:${k}`);
      expect(vacios).toEqual([]);
    }
  });
});
