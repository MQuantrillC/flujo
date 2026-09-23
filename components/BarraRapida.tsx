'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Flag, Sparkles } from 'lucide-react';
import { interpretar, type MiembroParaParse } from '@/lib/parseRapido';
import { fechaCorta } from '@/lib/fechas';
import { idiomaValido } from '@/lib/idioma';
import { crearTareaRapida } from '@/lib/acciones';
import { Avatar } from './Avatar';
import { Aparece } from './Animado';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Lo que va después de «@» para nombrar a alguien: su nombre de pila si nadie más lo comparte, si no, su correo sin el dominio. */
function aliasDe(m: MiembroParaParse, todos: MiembroParaParse[]): string {
  const pila = normalizar(m.nombre.split(/\s+/)[0] ?? '');
  const repetido = todos.some((o) => o.email !== m.email && normalizar(o.nombre.split(/\s+/)[0] ?? '') === pila);
  return !pila || repetido ? m.email.split('@')[0] : pila;
}

interface Sugerencia { clave: string; texto: string; detalle?: string; avatar?: string }

/**
 * La línea rápida. Mientras escribes, abajo se ve cómo se va a leer: título,
 * responsable, fecha, etiquetas. Al escribir «@» aparece el equipo y al escribir
 * «#» las etiquetas en uso; flechas para moverse, Enter o Tab para elegir. Enter
 * sin lista abierta crea el pendiente.
 */
export function BarraRapida({ equipoId, miembros, etiquetas = [] }: { equipoId: string; miembros: MiembroParaParse[]; etiquetas?: string[] }) {
  const t = useTranslations('barra');
  const te = useTranslations('errores');
  const idioma = idiomaValido(useLocale());
  const [texto, setTexto] = useState('');
  const [caret, setCaret] = useState(0);
  const [indice, setIndice] = useState(0);
  const [cerrada, setCerrada] = useState(false); // Esc cierra la lista hasta que cambie el token
  const [error, setError] = useState<string | null>(null);
  const [creadas, setCreadas] = useState(0);
  const [pendiente, iniciar] = useTransition();
  const [caretPendiente, setCaretPendiente] = useState<number | null>(null);
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);

  const lectura = useMemo(() => (texto.trim() ? interpretar(texto, miembros) : null), [texto, miembros]);
  const nombreDe = (email: string) => miembros.find((m) => m.email === email)?.nombre ?? email;

  // El token que se está escribiendo justo antes del cursor: «@har» o «#ven».
  const token = useMemo(() => {
    const m = texto.slice(0, caret).match(/(?:^|\s)([@#])([\w.\-]*)$/);
    return m ? { tipo: m[1] as '@' | '#', consulta: m[2], inicio: caret - m[2].length - 1 } : null;
  }, [texto, caret]);

  const sugerencias = useMemo<Sugerencia[]>(() => {
    if (!token) return [];
    const q = normalizar(token.consulta);
    if (token.tipo === '@') {
      return miembros
        .filter((m) => !q || normalizar(m.nombre).split(/\s+/).some((p) => p.startsWith(q)) || normalizar(m.email.split('@')[0]).startsWith(q) || normalizar(m.nombre).replace(/\s+/g, '').startsWith(q))
        .map((m) => ({ clave: m.email, texto: m.nombre, detalle: m.email, avatar: m.nombre }));
    }
    const lista: Sugerencia[] = etiquetas.filter((e) => !q || normalizar(e).startsWith(q)).map((e) => ({ clave: e, texto: `#${e}` }));
    if (q && !etiquetas.some((e) => normalizar(e) === q)) lista.unshift({ clave: token.consulta, texto: `#${token.consulta}`, detalle: t('nuevaEtiqueta') });
    return lista;
  }, [token, miembros, etiquetas, t]);

  const listaAbierta = !!token && !cerrada && sugerencias.length > 0;

  // Cada vez que cambia lo que se escribe tras «@» o «#», la lista vuelve al primero y se reabre.
  const claveToken = token ? `${token.tipo}${token.inicio}:${token.consulta}` : '';
  const [tokenVisto, setTokenVisto] = useState(claveToken);
  if (tokenVisto !== claveToken) { setTokenVisto(claveToken); setIndice(0); setCerrada(false); }

  useEffect(() => {
    if (caretPendiente === null || !campo.current) return;
    campo.current.setSelectionRange(caretPendiente, caretPendiente);
    setCaret(caretPendiente);
    setCaretPendiente(null);
  }, [caretPendiente, texto]);

  const elegir = (s: Sugerencia) => {
    if (!token) return;
    const alias = token.tipo === '@' ? aliasDe(miembros.find((m) => m.email === s.clave)!, miembros) : s.clave;
    const antes = texto.slice(0, token.inicio);
    const despues = texto.slice(caret).replace(/^\s+/, '');
    const nuevo = `${antes}${token.tipo}${alias} `;
    setTexto(nuevo + despues);
    setCaretPendiente(nuevo.length);
    campo.current?.focus();
  };

  const enviar = () => {
    if (!texto.trim() || pendiente) return;
    setError(null);
    iniciar(async () => {
      const r = await crearTareaRapida(equipoId, texto);
      if (r.ok) { setTexto(''); setCaret(0); setCreadas((n) => n + 1); router.refresh(); campo.current?.focus(); }
      else setError(te(r.error ?? 'generico'));
    });
  };

  const insertar = (s: string) => {
    const nuevo = (texto.endsWith(' ') || texto === '' ? texto : texto + ' ') + s + ' ';
    setTexto(nuevo);
    setCaretPendiente(nuevo.length);
    campo.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (listaAbierta) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndice((i) => (i + 1) % sugerencias.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndice((i) => (i - 1 + sugerencias.length) % sugerencias.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); elegir(sugerencias[indice]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setCerrada(true); return; }
    }
    if (e.key === 'Enter') { e.preventDefault(); enviar(); }
  };

  const actualizarCaret = () => setCaret(campo.current?.selectionStart ?? 0);

  return (
    <section className="tarjeta relative p-3">
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex items-center gap-2">
        <Sparkles size={18} className="shrink-0 text-acento" />
        <input
          ref={campo}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
          onKeyDown={onKeyDown}
          onKeyUp={actualizarCaret}
          onClick={actualizarCaret}
          onBlur={() => setCerrada(true)}
          onFocus={() => setCerrada(false)}
          placeholder={t('placeholder')}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
          autoComplete="off"
          autoFocus
          role="combobox"
          aria-expanded={listaAbierta}
          aria-controls="sugerencias-linea-rapida"
          aria-autocomplete="list"
        />
        <button type="submit" disabled={!texto.trim() || pendiente} className="boton">{pendiente ? t('creando') : t('crear')}</button>
      </form>

      <Aparece visible={listaAbierta} className="absolute left-9 top-12 z-30 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <ul role="listbox" id="sugerencias-linea-rapida">
          {sugerencias.map((s, i) => (
            <li
              key={s.clave}
              role="option"
              aria-selected={i === indice}
              onMouseDown={(e) => { e.preventDefault(); elegir(s); }}
              onMouseEnter={() => setIndice(i)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${i === indice ? 'bg-acento/10 text-acento' : 'text-gray-700'}`}
            >
              {s.avatar ? <Avatar nombre={s.avatar} tam="sm" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-acento/10 text-[11px] font-bold text-acento">#</span>}
              <span className="min-w-0 flex-1 truncate font-medium">{s.texto}</span>
              {s.detalle && <span className="truncate text-[11px] text-gray-400">{s.detalle}</span>}
            </li>
          ))}
        </ul>
        <p className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">{t('atajos')}</p>
      </Aparece>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {lectura ? (
          <>
            <span className="font-medium text-gray-700">{t('seCreara')}</span>
            <span className={`font-semibold ${lectura.titulo ? 'text-gray-800' : 'text-red-600'}`}>{lectura.titulo || t('sinTitulo')}</span>
            {lectura.asignados.map((a) => <span key={a} className="rounded-md bg-gray-100 px-1.5 py-0.5">@{nombreDe(a)}</span>)}
            {lectura.fechaLimite && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-800">{t('vence', { fecha: fechaCorta(lectura.fechaLimite, undefined, idioma) })}</span>}
            {lectura.etiquetas.map((e) => <span key={e} className="rounded-md bg-acento/10 px-1.5 py-0.5 text-acento">#{e}</span>)}
            {lectura.prioridad === 'alta' && <span className="flex items-center gap-1 text-red-600"><Flag size={11} className="fill-red-500" /> {t('alta')}</span>}
            {lectura.noResueltos.map((n) => <span key={n} className="text-red-600">{t('noEsDelEquipo', { alias: n })}</span>)}
          </>
        ) : (
          <>
            <span><b className="text-gray-600">@nombre</b> {t('ayudaResponsable')}</span>
            <span><b className="text-gray-600">#{t('ayudaEtiqueta')}</b></span>
            <span><b className="text-gray-600">!</b> {t('ayudaPrioridad')}</span>
            <span><b className="text-gray-600">{t('ayudaFechas')}</b> {t('ayudaFecha')}</span>
            {creadas > 0 && <span className="ml-auto text-emerald-700">{t('creados', { n: creadas })}</span>}
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex flex-wrap gap-1">
        {miembros.map((m) => (
          <button key={m.email} type="button" onClick={() => insertar('@' + aliasDe(m, miembros))} className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-500 hover:border-acento hover:text-acento">
            @{m.nombre.split(' ')[0]}
          </button>
        ))}
      </div>
    </section>
  );
}
