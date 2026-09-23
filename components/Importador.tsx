'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ClipboardCopy, FileUp, Flag, Sparkles, TriangleAlert } from 'lucide-react';
import { importarPendientes, previsualizarImportacion, type VistaPreviaImportacion } from '@/lib/acciones';
import { fechaCorta } from '@/lib/fechas';
import { idiomaValido } from '@/lib/idioma';
import type { Aviso } from '@/lib/importar';
import type { Usuario } from '@/lib/modelo';
import { Avatar } from './Avatar';
import { Aparece } from './Animado';

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
      try { setVista(await previsualizarImportacion(equipoId, texto)); }
      catch { setError(t('errorLeer')); }
    });
  };

  const importar = () => {
    if (!vista) return;
    iniciar(async () => {
      try { setResultado(await importarPendientes(equipoId, texto)); setVista(null); setTexto(''); }
      catch { setError(t('errorImportar')); }
    });
  };

  const validos = vista?.borradores.filter((b) => b.valido).length ?? 0;
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
              {vista.borradores.length - validos > 0 && <>, <b className="text-red-600">{t('omitidos', { n: vista.borradores.length - validos })}</b></>}.
              {' '}{t('avisosNota')}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <tr><th className="px-2 py-1">#</th><th className="px-2 py-1">{t('colPendiente')}</th><th className="px-2 py-1">{t('colResponsables')}</th><th className="px-2 py-1">{t('colVence')}</th><th className="px-2 py-1">{t('colEtiquetas')}</th><th className="px-2 py-1">{t('colEtapa')}</th><th className="px-2 py-1">{t('colAvisos')}</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vista.borradores.map((b) => (
                    <tr key={b.linea} className={b.valido ? '' : 'bg-red-50/60 text-gray-400'}>
                      <td className="px-2 py-1.5 text-gray-400">{b.linea}</td>
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-1 font-medium text-gray-800">{b.prioridad === 'alta' && <Flag size={11} className="fill-red-500 text-red-500" />}{b.titulo || <i className="font-normal text-red-600">{t('sinTitulo')}</i>}</span>
                        {b.descripcion && <span className="block max-w-xs truncate text-gray-400">{b.descripcion}</span>}
                      </td>
                      <td className="px-2 py-1.5"><span className="flex -space-x-1">{b.asignados.map((a) => <Avatar key={a} nombre={nombreDe(a)} tam="sm" />)}</span></td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{b.fechaLimite ? fechaCorta(b.fechaLimite, undefined, idioma) : ''}</td>
                      <td className="px-2 py-1.5">{b.etiquetas.map((e) => <span key={e} className="mr-1 rounded bg-acento/10 px-1 text-acento">#{e}</span>)}</td>
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
