'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ClipboardCopy, FileUp, Flag, Sparkles, TriangleAlert, X } from 'lucide-react';
import { importarPendientes, previsualizarImportacion, type VistaPreviaImportacion } from '@/lib/acciones';
import { fechaCorta } from '@/lib/fechas';
import { idiomaValido } from '@/lib/idioma';
import type { Aviso, Borrador } from '@/lib/importar';
import type { Usuario } from '@/lib/modelo';
import { Avatar } from './Avatar';
import { Aparece } from './Animado';
import { Tooltip } from './Tooltip';

/**
 * Importar en masa, en tres pasos: copiar el encargo para la IA, pegar (o subir)
 * lo que devuelva, revisar cómo se leyó y confirmar.
 */
export function Importador({ equipoId, prompt, miembros }: { equipoId: string; prompt: string; miembros: Usuario[] }) {
  const t = useTranslations('importar');
  const te = useTranslations('errores');
  const idioma = idiomaValido(useLocale());
  const [texto, setTexto] = useState('');
  const [vista, setVista] = useState<VistaPreviaImportacion | null>(null);
  // Copia editable de lo leído: aquí se retocan las etiquetas antes de importar.
  const [filas, setFilas] = useState<Borrador[]>([]);
  const [resultado, setResultado] = useState<{ creados: number; omitidos: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const archivo = useRef<HTMLInputElement>(null);
  const nombreDe = (email: string) => miembros.find((m) => m.email === email)?.nombre ?? email;
  const aviso = (a: Aviso) => (a.clave === 'sinTitulo' ? t('avisos.sinTitulo') : t(`avisos.${a.clave}`, { valor: a.valor }));

  const copiar = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const cargarArchivo = async (f: File) => {
    setError(null); setVista(null); setResultado(null);
    if (/\.xlsx?$/i.test(f.name)) {
      const fd = new FormData(); fd.set('archivo', f);
      const r = await fetch(`/api/equipos/${equipoId}/importar`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setError(te(j?.error ?? 'noLegible', { nombre: j?.nombre ?? '', mb: 5 })); return; }
      setTexto(j.texto);
    } else {
      setTexto(await f.text());
    }
  };

  const previsualizar = () => {
    if (!texto.trim()) return;
    setError(null); setResultado(null);
    iniciar(async () => {
      try { const v = await previsualizarImportacion(equipoId, texto); setVista(v); setFilas(v.borradores); }
      catch { setError(t('errorLeer')); }
    });
  };

  // Sólo viajan al servidor las filas cuyas etiquetas se tocaron (las demás siguen siendo el mismo arreglo).
  const ajustes = () => ({ etiquetas: Object.fromEntries(filas.filter((f, i) => f.etiquetas !== vista?.borradores[i].etiquetas).map((f) => [f.linea, f.etiquetas])) });
  const importar = () => {
    if (!vista) return;
    iniciar(async () => {
      try { setResultado(await importarPendientes(equipoId, texto, ajustes())); setVista(null); setTexto(''); }
      catch { setError(t('errorImportar')); }
    });
  };

  const validos = filas.filter((b) => b.valido).length;
  const conteo = new Map<string, number>();
  for (const f of filas) if (f.valido) for (const e of f.etiquetas) conteo.set(e, (conteo.get(e) ?? 0) + 1);
  const resumen = [...conteo].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const hayVarias = filas.some((f) => f.valido && f.etiquetas.length > 1);
  const editado = !!vista && filas.some((f, i) => f.etiquetas !== vista.borradores[i].etiquetas);
  const quitarDeTodos = (e: string) => setFilas((fs) => fs.map((f) => (f.etiquetas.includes(e) ? { ...f, etiquetas: f.etiquetas.filter((x) => x !== e) } : f)));
  const quitarDeUno = (linea: number, e: string) => setFilas((fs) => fs.map((f) => (f.linea === linea ? { ...f, etiquetas: f.etiquetas.filter((x) => x !== e) } : f)));
  const soloPrimera = () => setFilas((fs) => fs.map((f) => (f.etiquetas.length > 1 ? { ...f, etiquetas: [f.etiquetas[0]] } : f)));
  const deshacer = () => { if (vista) setFilas(vista.borradores); };
  const paso = (n: number) => <span className="grid h-6 w-6 place-items-center rounded-full bg-acento text-xs text-white dark:text-gray-900">{n}</span>;

  return (
    <div className="flex flex-col gap-5">
      <section className="tarjeta p-5">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800">{paso(1)} {t('paso1')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('paso1Ayuda')}</p>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">{prompt}</pre>
        <button type="button" onClick={copiar} className="boton mt-3">{copiado ? <><Check size={14} /> {t('copiado')}</> : <><ClipboardCopy size={14} /> {t('copiar')}</>}</button>
      </section>

      <section className="tarjeta p-5">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800">{paso(2)} {t('paso2')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('paso2Ayuda')} <span className="font-mono text-gray-700">@harold revisar /master/insights esta semana #insights</span></p>
        <textarea value={texto} onChange={(e) => { setTexto(e.target.value); setVista(null); setResultado(null); }} rows={8} className="campo mt-3 font-mono text-xs" placeholder={t('placeholder')} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input ref={archivo} type="file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void cargarArchivo(f); e.target.value = ''; }} />
          <button type="button" onClick={() => archivo.current?.click()} className="boton-suave"><FileUp size={14} /> {t('subir')}</button>
          <button type="button" onClick={previsualizar} disabled={!texto.trim() || pendiente} className="boton"><Sparkles size={14} /> {pendiente && !vista ? t('leyendo') : t('leer')}</button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      <Aparece visible={!!vista}>
        {vista && (
          <section className="tarjeta p-5">
            <h2 className="flex items-center gap-2 font-semibold text-gray-800">{paso(3)} {t('paso3')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('leidoComo', { formato: t(vista.formato) })} <b className="text-gray-700">{t('listos', { n: validos })}</b>
              {filas.length - validos > 0 && <>, <b className="text-red-600">{t('omitidos', { n: filas.length - validos })}</b></>}.
              {' '}{t('avisosNota')}
            </p>
            {(resumen.length > 0 || editado) && (
              <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs"><span className="font-semibold text-gray-700">{t('etiquetasTitulo')}</span> <span className="text-gray-400">{t('etiquetasAyuda')}</span></p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resumen.map(([e, n]) => (
                    <Tooltip key={e} texto={t('quitarDeTodos', { e })}>
                      <button type="button" onClick={() => quitarDeTodos(e)} className="inline-flex items-center gap-1 rounded-md bg-acento/10 px-1.5 py-0.5 text-xs text-acento transition-colors hover:bg-red-50 hover:text-red-600">
                        #{e} <span className="text-[10px] opacity-60">{n}</span> <X size={11} />
                      </button>
                    </Tooltip>
                  ))}
                </div>
                {(hayVarias || editado) && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {hayVarias && <button type="button" onClick={soloPrimera} className="font-semibold text-acento hover:underline">{t('soloPrimera')}</button>}
                    {editado && <button type="button" onClick={deshacer} className="text-gray-500 hover:underline">{t('deshacerEtiquetas')}</button>}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <tr><th className="px-2 py-1">#</th><th className="px-2 py-1">{t('colPendiente')}</th><th className="px-2 py-1">{t('colResponsables')}</th><th className="px-2 py-1">{t('colVence')}</th><th className="px-2 py-1">{t('colEtiquetas')}</th><th className="px-2 py-1">{t('colEtapa')}</th><th className="px-2 py-1">{t('colAvisos')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map((b) => (
                    <tr key={b.linea} className={b.valido ? '' : 'bg-red-50/60 text-gray-400'}>
                      <td className="px-2 py-1.5 text-gray-400">{b.linea}</td>
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-1 font-medium text-gray-800">{b.prioridad === 'alta' && <Flag size={11} className="fill-red-500 text-red-500" />}{b.titulo || <i className="font-normal text-red-600">{t('sinTitulo')}</i>}</span>
                        {b.descripcion && <span className="block max-w-xs truncate text-gray-400">{b.descripcion}</span>}
                      </td>
                      <td className="px-2 py-1.5"><span className="flex -space-x-1">{b.asignados.map((a) => <Avatar key={a} nombre={nombreDe(a)} tam="sm" />)}</span></td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{b.fechaLimite ? fechaCorta(b.fechaLimite, undefined, idioma) : ''}</td>
                      <td className="px-2 py-1.5">
                        <span className="flex flex-wrap gap-1">
                          {b.etiquetas.map((e) => (
                            <span key={e} className="inline-flex items-center gap-0.5 rounded bg-acento/10 px-1 text-acento">
                              #{e}
                              <button type="button" onClick={() => quitarDeUno(b.linea, e)} aria-label={t('quitarDeEste', { e })} className="rounded text-acento/50 transition-colors hover:text-red-600"><X size={10} /></button>
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-500">{b.etapa ?? ''}</td>
                      <td className="px-2 py-1.5 text-amber-700">{b.avisos.map((a, i) => <span key={i} className="flex items-center gap-1"><TriangleAlert size={11} /> {aviso(a)}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={importar} disabled={validos === 0 || pendiente} className="boton"><Check size={14} /> {pendiente ? t('importando') : t('importarN', { n: validos })}</button>
              <button type="button" onClick={() => setVista(null)} className="boton-suave">{t('volverEditar')}</button>
            </div>
          </section>
        )}
      </Aparece>

      <Aparece visible={!!resultado}>
        {resultado && (
          <section className="tarjeta border-emerald-200 bg-emerald-50/60 p-5 text-sm text-emerald-900">
            <p className="font-semibold">{t('listo', { n: resultado.creados })}{resultado.omitidos > 0 && t('omitidosFinal', { n: resultado.omitidos })}.</p>
            <Link href={`/e/${equipoId}`} className="mt-2 inline-block font-semibold text-acento underline underline-offset-2">{t('irTablero')}</Link>
          </section>
        )}
      </Aparece>
    </div>
  );
}
