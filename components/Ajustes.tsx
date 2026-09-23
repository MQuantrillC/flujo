'use client';

// Los dos ajustes que viven en la cabecera: tema (claro/oscuro) e idioma.
// Los dos se guardan en una cookie que el servidor lee en la siguiente carga.

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';
import { COOKIE_IDIOMA, COOKIE_TEMA, IDIOMAS, type Idioma } from '@/lib/idioma';

const UN_ANIO = 60 * 60 * 24 * 365;
const guardarCookie = (nombre: string, valor: string) => { document.cookie = `${nombre}=${valor}; path=/; max-age=${UN_ANIO}; samesite=lax`; };

/** Sol en el tema oscuro, luna en el claro: al tocar, cambia al otro y lo recuerda. */
export function SelectorTema() {
  const t = useTranslations('comun');
  const cambiar = () => {
    const html = document.documentElement;
    const aOscuro = !html.classList.contains('dark');
    html.classList.toggle('dark', aOscuro);
    guardarCookie(COOKIE_TEMA, aOscuro ? 'dark' : 'light');
  };
  return (
    <button type="button" onClick={cambiar} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" aria-label={t('temaOscuro')}>
      <Moon size={16} className="dark:hidden" />
      <Sun size={16} className="hidden dark:block" />
    </button>
  );
}

/** ES · EN · PT. Cambiar recarga los textos del servidor en el idioma nuevo. */
export function SelectorIdioma() {
  const actual = useLocale() as Idioma;
  const t = useTranslations('comun');
  const router = useRouter();
  return (
    <span className="flex items-center rounded-md border border-gray-200 bg-white p-0.5 text-[11px] font-bold" role="group" aria-label={t('idioma')}>
      {IDIOMAS.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => { guardarCookie(COOKIE_IDIOMA, i); router.refresh(); }}
          className={`rounded px-1.5 py-0.5 uppercase transition-colors ${i === actual ? 'bg-acento text-white dark:text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
          aria-pressed={i === actual}
        >
          {i}
        </button>
      ))}
    </span>
  );
}

export function Ajustes() {
  return (
    <span className="flex items-center gap-1.5">
      <SelectorIdioma />
      <SelectorTema />
    </span>
  );
}
