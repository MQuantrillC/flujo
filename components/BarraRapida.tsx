'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Flag, Link2, Sparkles } from 'lucide-react';
import { nombresCortos } from '@/lib/nombres';
import { interpretar, type MiembroParaParse } from '@/lib/parseRapido';
import { fechaCorta } from '@/lib/fechas';
import { etiquetaEnlace } from '@/lib/enlaces';
import { idiomaValido } from '@/lib/idioma';
import { crearTareaRapida } from '@/lib/acciones';
import { Avatar } from './Avatar';
import { Aparece } from './Animado';
import { Ejemplos } from './Ejemplos';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Lo que va después de «@» para nombrar a alguien: su nombre de pila si nadie más lo comparte, si no, su correo sin el dominio. */
function aliasDe(m: MiembroParaParse, todos: MiembroParaParse[]): string {
  const pila = normalizar(m.nombre.split(/\s+/)[0] ?? '');
  const repetido = todos.some((o) => o.email !== m.email && normalizar(o.nombre.split(/\s+/)[0] ?? '') === pila);
  return !pila || repetido ? m.email.split('@')[0] : pila;
}

/** Nombres inventados para los ejemplos cuando el equipo es muy chico. */
const ALIAS_GENERICOS = ['nicolas', 'andrea', 'harold'];

interface Sugerencia { clave: string; texto: string; detalle?: string; avatar?: string }

/**
 * La línea rápida. Mientras escribes, abajo se ve cómo se va a leer: título,
 * responsable, fecha, etiquetas, enlaces. Al escribir «@» aparece el equipo y al
 * escribir «#» las etiquetas en uso; flechas para moverse, Enter o Tab para
 * elegir. Enter sin lista abierta crea el pendiente. Con el campo vacío, debajo
 * se van escribiendo ejemplos con los nombres del equipo.
 */
export function BarraRapida({ equipoId, miembros, etiquetas = [], nota }: { equipoId: string; miembros: MiembroParaParse[]; etiquetas?: string[]; nota?: string }) {
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
  const cortos = useMemo(() => nombresCortos(miembros), [miembros]);

  // Los ejemplos: uno genérico y luego frases con la gente del equipo (o nombres inventados si son pocos).
  const ejemplos = useMemo(() => {
    const alias = miembros.map((m) => aliasDe(m, miembros));
    for (const g of ALIAS_GENERICOS) if (alias.length < 2 && !alias.includes(g)) alias.push(g);
    const plantillas = t.raw('ejemplos') as string[];
    return [t('ejemploGenerico'), ...plantillas.map((p, k) => p.replaceAll('{a}', alias[k % alias.length]).replaceAll('{b}', alias[(k + 1) % alias.length]))];
  }, [miembros, t]);

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

  const poner = (s: string) => {
    setTexto(s);
    setCaretPendiente(s.length);
    campo.current?.focus();
  };

  const insertar = (s: string) => poner((texto.endsWith(' ') || texto === '' ? texto : texto + ' ') + s + ' ');

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

      <Aparece visible={listaAbierta} className="absolute left-9 top-12 z-30 w-80 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
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
              {s.avatar ? <Avatar nombre={s.avatar} tam="sm" sinTooltip /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-acento/10 text-[11px] font-bold text-acento">#</span>}
              <span className="min-w-0 flex-1 truncate font-medium">{s.texto}</span>
              {s.detalle && <span className="truncate text-[11px] text-gray-400">{s.detalle}</span>}
            </li>
          ))}
        </ul>
        <p className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">{t('atajos')}</p>
      </Aparece>

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {lectura ? (
          <>
            <span className="font-medium text-gray-700">{t('seCreara')}</span>
            <span className={`font-semibold ${lectura.titulo ? 'text-gray-800' : 'text-red-600'}`}>{lectura.titulo || t('sinTitulo')}</span>
            {lectura.asignados.map((a) => <span key={a} className="rounded-md bg-gray-100 px-1.5 py-0.5">@{nombreDe(a)}</span>)}
            {lectura.fechaLimite && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-800">{t('vence', { fecha: fechaCorta(lectura.fechaLimite, undefined, idioma) })}</span>}
            {lectura.etiquetas.map((e) => <span key={e} className="rounded-md bg-acento/10 px-1.5 py-0.5 text-acento">#{e}</span>)}
            {lectura.enlaces.map((u) => <span key={u} className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-sky-800"><Link2 size={11} /> {etiquetaEnlace(u)}</span>)}
            {lectura.prioridad === 'alta' && <span className="flex items-center gap-1 text-red-600"><Flag size={11} className="fill-red-500" /> {t('alta')}</span>}
            {lectura.noResueltos.map((n) => <span key={n} className="text-red-600">{t('noEsDelEquipo', { alias: n })}</span>)}
          </>
        ) : (
          <>
            <Ejemplos ejemplos={ejemplos} etiqueta={t('ejemplosTitulo')} onElegir={poner} />
            {creadas > 0 && <span className="ml-auto text-emerald-700">{t('creados', { n: creadas })}</span>}
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {miembros.map((m) => (
          <button key={m.email} type="button" onClick={() => insertar('@' + aliasDe(m, miembros))} className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-500 hover:border-acento hover:text-acento">
            @{cortos[m.email]}
          </button>
        ))}
        {nota && <span className="ml-auto text-[11px] text-gray-400">{nota}</span>}
      </div>
    </section>
  );
}
