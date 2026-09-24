'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { aIso, deIso, dia, fechaCorta, sumarDias } from '@/lib/fechas';
import { ETIQUETA_INTL, idiomaValido } from '@/lib/idioma';
import { Flotante, medir, type Ancla } from './Flotante';

/** Lunes … domingo, con la inicial de cada día en el idioma de la interfaz. */
function inicialesDias(etiqueta: string): string[] {
  const f = new Intl.DateTimeFormat(etiqueta, { weekday: 'narrow' });
  const lunes = new Date(2024, 0, 1); // un lunes cualquiera
  return Array.from({ length: 7 }, (_, i) => f.format(sumarDias(lunes, i)).toUpperCase());
}

/**
 * El calendario para elegir una fecha límite, con el estilo de la app en vez del
 * del navegador. Manda un campo oculto `name` con la fecha ISO (o vacío).
 */
export function SelectorFecha({ name, valor: inicial }: { name: string; valor: string | null }) {
  const t = useTranslations('tarea');
  const idioma = idiomaValido(useLocale());
  const etiqueta = ETIQUETA_INTL[idioma];
  const hoy = dia();
  const [valor, setValor] = useState<string | null>(inicial);
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const [mes, setMes] = useState(() => { const d = valor ? deIso(valor) : hoy; return new Date(d.getFullYear(), d.getMonth(), 1, 12); });
  const abierto = !!ancla;

  const abrir = (el: HTMLElement) => { const d = valor ? deIso(valor) : hoy; setMes(new Date(d.getFullYear(), d.getMonth(), 1, 12)); setAncla(medir(el)); };
  const cerrar = () => setAncla(null);
  const elegir = (d: Date | null) => { setValor(d ? aIso(d) : null); cerrar(); };

  // La cuadrícula: 6 semanas desde el lunes anterior (o igual) al día 1.
  const primero = sumarDias(mes, -((mes.getDay() + 6) % 7));
  const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(primero, i));
  const tituloMes = new Intl.DateTimeFormat(etiqueta, { month: 'long', year: 'numeric' }).format(mes);
  const hoyIso = aIso(hoy);

  return (
    <>
      <input type="hidden" name={name} value={valor ?? ''} />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => (abierto ? cerrar() : abrir(e.currentTarget))}
          onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          className={`campo flex items-center gap-2 text-left ${valor ? 'text-gray-800' : 'text-gray-400'}`}
        >
          <CalendarDays size={15} className="shrink-0 text-gray-400" />
          <span className="flex-1 truncate">{valor ? fechaCorta(valor, hoy, idioma) : t('sinFecha')}</span>
          {valor && <span className="text-[11px] text-gray-400">{valor}</span>}
        </button>
        {valor && (
          <button type="button" onClick={() => elegir(null)} aria-label={t('quitarFecha')} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"><X size={14} /></button>
        )}
      </div>

      <Flotante abierto={abierto} ancla={ancla} lado="abajo" alinear="izquierda" alto={330} onCerrar={cerrar} rol="dialog" className="w-72">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1, 12))} aria-label={t('mesAnterior')} className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold capitalize text-gray-800">{tituloMes}</span>
            <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1, 12))} aria-label={t('mesSiguiente')} className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {inicialesDias(etiqueta).map((d, i) => <span key={i} className="py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{d}</span>)}
            {celdas.map((d) => {
              const iso = aIso(d);
              const deEsteMes = d.getMonth() === mes.getMonth();
              const elegida = iso === valor;
              const esHoy = iso === hoyIso;
              const finDeSemana = d.getDay() === 0 || d.getDay() === 6;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => elegir(d)}
                  aria-pressed={elegida}
                  className={`h-8 rounded-lg text-sm transition-colors ${
                    elegida ? 'bg-acento font-semibold text-white dark:text-gray-900'
                    : esHoy ? 'font-semibold text-acento ring-1 ring-acento/50 hover:bg-acento/10'
                    : !deEsteMes ? 'text-gray-300 hover:bg-gray-100'
                    : finDeSemana ? 'text-gray-500 hover:bg-gray-100'
                    : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
            <button type="button" onClick={() => elegir(hoy)} className="rounded-md px-2 py-1 font-semibold text-acento transition-colors hover:bg-acento/10">{t('hoy')}</button>
            <button type="button" onClick={() => elegir(null)} className="rounded-md px-2 py-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">{t('quitarFecha')}</button>
          </div>
        </div>
      </Flotante>
    </>
  );
}
