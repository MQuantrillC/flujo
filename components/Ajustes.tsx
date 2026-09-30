'use client';

// Los dos ajustes que viven en la cabecera: tema (claro/oscuro) e idioma.
// Los dos se guardan en una cookie que el servidor lee en la siguiente carga;
// el idioma, además, en la cuenta (para escribirle a cada uno en el suyo).

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Languages, Moon, Sun } from 'lucide-react';
import { idiomaAccion } from '@/lib/acciones';
import { COOKIE_TEMA, IDIOMAS, type Idioma } from '@/lib/idioma';
import { Flotante, medir, type Ancla } from './Flotante';

const UN_ANIO = 60 * 60 * 24 * 365;
const guardarCookie = (nombre: string, valor: string) => { document.cookie = `${nombre}=${valor}; path=/; max-age=${UN_ANIO}; samesite=lax`; };

/** Cada idioma escrito en su propio idioma: quien no entiende el actual reconoce el suyo. */
const NOMBRE_PROPIO: Record<Idioma, string> = { es: 'Español', en: 'English', pt: 'Português' };

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
    <button type="button" onClick={cambiar} className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" aria-label={t('temaOscuro')}>
      <Moon size={16} className="dark:hidden" />
      <Sun size={16} className="hidden dark:block" />
    </button>
  );
}

/** Un icono de idiomas que abre la lista vertical: Español, English, Português. */
export function SelectorIdioma() {
  const actual = useLocale() as Idioma;
  const t = useTranslations('comun');
  const router = useRouter();
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const [indice, setIndice] = useState(0);
  const [pendiente, iniciar] = useTransition();
  const abierto = !!ancla;

  const abrir = (el: HTMLElement) => { setIndice(Math.max(0, IDIOMAS.indexOf(actual))); setAncla(medir(el)); };
  const cerrar = () => setAncla(null);
  const elegir = (i: Idioma) => {
    cerrar();
    if (i === actual) return;
    iniciar(async () => { await idiomaAccion(i); router.refresh(); });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(e.currentTarget); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndice((i) => (i + 1) % IDIOMAS.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndice((i) => (i - 1 + IDIOMAS.length) % IDIOMAS.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(IDIOMAS[indice]); }
    else if (e.key === 'Tab') cerrar();
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => (abierto ? cerrar() : abrir(e.currentTarget))}
        onKeyDown={onKeyDown}
        // Se cierra al salir: la lista no roba el foco (onMouseDown abajo), así que perderlo es hacer clic fuera.
        onBlur={cerrar}
        disabled={pendiente}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={`${t('idioma')}: ${NOMBRE_PROPIO[actual]}`}
        title={`${t('idioma')}: ${NOMBRE_PROPIO[actual]}`}
        className={`rounded-md p-2 transition-colors hover:bg-gray-100 hover:text-gray-700 ${abierto ? 'bg-gray-100 text-gray-700' : 'text-gray-400'}`}
      >
        <Languages size={17} />
      </button>
      <Flotante abierto={abierto} ancla={ancla} lado="abajo" alinear="derecha" alto={IDIOMAS.length * 38 + 12} onCerrar={cerrar} rol="listbox" className="min-w-44">
        <ul className="rounded-xl border border-gray-200 bg-white p-1 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          {IDIOMAS.map((i, k) => (
            <li key={i}>
              <button
                type="button"
                role="option"
                aria-selected={i === actual}
                onClick={() => elegir(i)}
                onMouseEnter={() => setIndice(k)}
                lang={i}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${k === indice ? 'bg-gray-100' : ''} ${i === actual ? 'font-semibold text-acento' : 'text-gray-700'}`}
              >
                <span className="w-7 text-[11px] font-bold uppercase text-gray-400">{i}</span>
                <span className="flex-1">{NOMBRE_PROPIO[i]}</span>
                {i === actual && <Check size={14} className="text-acento" />}
              </button>
            </li>
          ))}
        </ul>
      </Flotante>
    </>
  );
}

export function Ajustes() {
  return (
    <span className="flex items-center gap-0.5">
      <SelectorIdioma />
      <SelectorTema />
    </span>
  );
}
