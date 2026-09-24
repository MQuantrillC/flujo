'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { aIso, deIso, dia, fechaCorta, sumarDias } from '@/lib/fechas';
import { ETIQUETA_INTL, idiomaValido } from '@/lib/idioma';
import { Flotante, medir, type Ancla } from './Flotante';

type Vista = 'dias' | 'meses' | 'anios';

/** Lunes … domingo, con la inicial de cada día en el idioma de la interfaz. */
function inicialesDias(etiqueta: string): string[] {
  const f = new Intl.DateTimeFormat(etiqueta, { weekday: 'narrow' });
  const lunes = new Date(2024, 0, 1); // un lunes cualquiera
  return Array.from({ length: 7 }, (_, i) => f.format(sumarDias(lunes, i)).toUpperCase());
}

const capitalizar = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * El calendario de la app, en vez del del navegador. Manda un campo oculto
 * `name` con la fecha ISO (o vacío). Dos modos:
 *  - «plazo» (fecha límite): muestra «mañana», «vie 25 sep», con botón «Hoy»;
 *  - «nacimiento» (cumpleaños): muestra la fecha completa y arranca años atrás.
 * Tocando el título del mes se pasa a elegir año (de 12 en 12) y luego mes.
 */
export function SelectorFecha({ name, valor: inicial, modo = 'plazo', placeholder }: {
  name: string; valor: string | null; modo?: 'plazo' | 'nacimiento'; placeholder?: string;
}) {
  const t = useTranslations('tarea');
  const idioma = idiomaValido(useLocale());
  const etiqueta = ETIQUETA_INTL[idioma];
  const hoy = dia();
  const [valor, setValor] = useState<string | null>(inicial);
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const [vista, setVista] = useState<Vista>('dias');
  const mesInicial = () => {
    const d = valor ? deIso(valor) : modo === 'nacimiento' ? new Date(hoy.getFullYear() - 25, 0, 1, 12) : hoy;
    return new Date(d.getFullYear(), d.getMonth(), 1, 12);
  };
  const [mes, setMes] = useState(mesInicial);
  const abierto = !!ancla;

  const abrir = (el: HTMLElement) => { setMes(mesInicial()); setVista('dias'); setAncla(medir(el)); };
  const cerrar = () => setAncla(null);
  const elegir = (d: Date | null) => { setValor(d ? aIso(d) : null); cerrar(); };
  const irA = (anio: number, m: number) => setMes(new Date(anio, m, 1, 12));

  // La cuadrícula de días: 6 semanas desde el lunes anterior (o igual) al día 1.
  const primero = sumarDias(mes, -((mes.getDay() + 6) % 7));
  const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(primero, i));
  const tituloMes = capitalizar(new Intl.DateTimeFormat(etiqueta, { month: 'long', year: 'numeric' }).format(mes));
  const nombresMeses = Array.from({ length: 12 }, (_, i) => capitalizar(new Intl.DateTimeFormat(etiqueta, { month: 'short' }).format(new Date(2024, i, 1))));
  const anioBase = Math.floor(mes.getFullYear() / 12) * 12;
  const anios = Array.from({ length: 12 }, (_, i) => anioBase + i);
  const hoyIso = aIso(hoy);
  const textoValor = valor
    ? modo === 'nacimiento' ? new Intl.DateTimeFormat(etiqueta, { day: 'numeric', month: 'long', year: 'numeric' }).format(deIso(valor)) : fechaCorta(valor, hoy, idioma)
    : (placeholder ?? t('sinFecha'));

  const botonNav = 'rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800';
  const anterior = () => (vista === 'dias' ? irA(mes.getFullYear(), mes.getMonth() - 1) : vista === 'meses' ? irA(mes.getFullYear() - 1, mes.getMonth()) : irA(mes.getFullYear() - 12, mes.getMonth()));
  const siguiente = () => (vista === 'dias' ? irA(mes.getFullYear(), mes.getMonth() + 1) : vista === 'meses' ? irA(mes.getFullYear() + 1, mes.getMonth()) : irA(mes.getFullYear() + 12, mes.getMonth()));
  const titulo = vista === 'dias' ? tituloMes : vista === 'meses' ? String(mes.getFullYear()) : `${anioBase} – ${anioBase + 11}`;

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
          <span className="flex-1 truncate">{textoValor}</span>
          {valor && modo === 'plazo' && <span className="text-[11px] text-gray-400">{valor}</span>}
        </button>
        {valor && (
          <button type="button" onClick={() => elegir(null)} aria-label={t('quitarFecha')} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"><X size={14} /></button>
        )}
      </div>

      <Flotante abierto={abierto} ancla={ancla} lado="abajo" alinear="izquierda" alto={330} onCerrar={cerrar} rol="dialog" className="w-72">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={anterior} aria-label={t('mesAnterior')} className={botonNav}><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setVista(vista === 'dias' ? 'anios' : vista === 'anios' ? 'meses' : 'dias')} aria-label={t('cambiarMesAnio')} className="rounded-md px-2 py-0.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 hover:text-acento">{titulo}</button>
            <button type="button" onClick={siguiente} aria-label={t('mesSiguiente')} className={botonNav}><ChevronRight size={16} /></button>
          </div>

          {vista === 'dias' && (
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
          )}

          {vista === 'meses' && (
            <div className="grid grid-cols-3 gap-1">
              {nombresMeses.map((n, i) => (
                <button key={i} type="button" onClick={() => { irA(mes.getFullYear(), i); setVista('dias'); }}
                  className={`h-9 rounded-lg text-sm transition-colors ${i === mes.getMonth() ? 'bg-acento/10 font-semibold text-acento' : 'text-gray-800 hover:bg-gray-100'}`}>{n}</button>
              ))}
            </div>
          )}

          {vista === 'anios' && (
            <div className="grid grid-cols-3 gap-1">
              {anios.map((a) => (
                <button key={a} type="button" onClick={() => { irA(a, mes.getMonth()); setVista('meses'); }}
                  className={`h-9 rounded-lg text-sm transition-colors ${a === mes.getFullYear() ? 'bg-acento/10 font-semibold text-acento' : a === hoy.getFullYear() ? 'text-acento hover:bg-gray-100' : 'text-gray-800 hover:bg-gray-100'}`}>{a}</button>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
            {modo === 'plazo' ? <button type="button" onClick={() => elegir(hoy)} className="rounded-md px-2 py-1 font-semibold text-acento transition-colors hover:bg-acento/10">{t('hoy')}</button> : <span />}
            <button type="button" onClick={() => elegir(null)} className="rounded-md px-2 py-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">{t('quitarFecha')}</button>
          </div>
        </div>
      </Flotante>
    </>
  );
}
