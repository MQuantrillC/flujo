'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRightLeft, Copy } from 'lucide-react';
import { pasarPendientesAccion, type ResultadoPase } from '@/lib/acciones';
import { FILTROS, MODOS, seleccionar, type Filtro, type Modo, type TareaResumida } from '@/lib/copiar';

/**
 * Copiar o mover pendientes a otro de mis equipos: eliges destino, cuáles y
 * cómo, y el botón dice cuántos van. La selección real la repite el servidor.
 */
export function PasarPendientes({ equipoId, destinos, tareas, finales, etiquetas, yo }: {
  equipoId: string; destinos: { id: string; nombre: string }[]; tareas: TareaResumida[]; finales: string[]; etiquetas: string[]; yo: string;
}) {
  const t = useTranslations('pasar');
  const [resultado, enviar, pendiente] = useActionState<ResultadoPase, FormData>(pasarPendientesAccion, null);
  const [destino, setDestino] = useState(destinos[0]?.id ?? '');
  const [filtro, setFiltro] = useState<Filtro>('abiertos');
  const [etiqueta, setEtiqueta] = useState(etiquetas[0] ?? '');
  const [modo, setModo] = useState<Modo>('copiar');
  const n = seleccionar(tareas, new Set(finales), filtro, etiqueta, yo).length;
  const nombreDestino = destinos.find((d) => d.id === destino)?.nombre ?? '';

  if (destinos.length === 0) {
    return <p className="text-sm text-gray-500">{t('sinDestino')} <Link href="/" className="font-semibold text-acento hover:underline">{t('crearEquipo')}</Link></p>;
  }

  const opcion = (activa: boolean) => `rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${activa ? 'border-acento bg-acento/10 text-acento' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'}`;
  const grupo = (titulo: string, children: React.ReactNode) => (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );

  return (
    <form action={enviar} onSubmit={(e) => { if (modo === 'mover' && !confirm(t('confirmarMover', { n, equipo: nombreDestino }))) e.preventDefault(); }} className="flex flex-col gap-4">
      <input type="hidden" name="equipoId" value={equipoId} />
      <input type="hidden" name="destino" value={destino} />
      <input type="hidden" name="filtro" value={filtro} />
      <input type="hidden" name="etiqueta" value={filtro === 'etiqueta' ? etiqueta : ''} />
      <input type="hidden" name="modo" value={modo} />

      {grupo(t('destino'), destinos.map((d) => <button key={d.id} type="button" onClick={() => setDestino(d.id)} aria-pressed={destino === d.id} className={opcion(destino === d.id)}>{d.nombre}</button>))}
      {grupo(t('cuales'), FILTROS.filter((f) => f !== 'etiqueta' || etiquetas.length > 0).map((f) => <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={opcion(filtro === f)}>{t(`filtros.${f}`)}</button>))}
      {filtro === 'etiqueta' && grupo(t('etiqueta'), etiquetas.map((e) => <button key={e} type="button" onClick={() => setEtiqueta(e)} aria-pressed={etiqueta === e} className={opcion(etiqueta === e)}>#{e}</button>))}
      {grupo(t('como'), MODOS.map((m) => <button key={m} type="button" onClick={() => setModo(m)} aria-pressed={modo === m} className={opcion(modo === m)}>{t(`modos.${m}`)}</button>))}

      <p className="text-xs text-gray-400">{t('nota')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="boton" disabled={n === 0 || pendiente}>
          {modo === 'mover' ? <ArrowRightLeft size={14} /> : <Copy size={14} />} {pendiente ? t('pasando') : t(`boton.${modo}`, { n, equipo: nombreDestino })}
        </button>
        {resultado?.ok && !pendiente && (
          <span className="desvanecer text-sm text-emerald-700">
            {t(`listo.${resultado.modo}`, { n: resultado.n, equipo: resultado.destino })} <Link href={`/e/${destinos.find((d) => d.nombre === resultado.destino)?.id ?? ''}`} className="font-semibold text-acento hover:underline">{t('verEquipo')}</Link>
          </span>
        )}
        {resultado && !resultado.ok && !pendiente && <span className="text-sm text-red-600">{t(`errores.${resultado.error}`)}</span>}
      </div>
    </form>
  );
}
