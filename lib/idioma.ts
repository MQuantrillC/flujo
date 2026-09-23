// Los idiomas de la interfaz y cómo se recuerda la elección (una cookie, sin rutas por idioma).

export const IDIOMAS = ['es', 'en', 'pt'] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = 'es';
export const COOKIE_IDIOMA = 'flujo_idioma';
export const COOKIE_TEMA = 'flujo_tema';

export function idiomaValido(v: unknown): Idioma {
  return IDIOMAS.includes(v as Idioma) ? (v as Idioma) : IDIOMA_POR_DEFECTO;
}

/** La etiqueta BCP 47 para Intl. */
export const ETIQUETA_INTL: Record<Idioma, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR' };
