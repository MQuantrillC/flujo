import Link from 'next/link';
import { Copy, Flag, Link2, MessageSquare, Paperclip, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Etapa, Tarea } from '@/lib/modelo';
import { etiquetaEnlace } from '@/lib/enlaces';
import { idiomaValido } from '@/lib/idioma';
import { AccionesTarjeta } from './AccionesTarjeta';
import { Avatar } from './Avatar';
import { ChipFecha } from './ChipFecha';
import { SelectorEtapa } from './SelectorEtapa';
import { TarjetaAnimada } from './Animado';
import { Tooltip } from './Tooltip';

const MAX_ENLACES = 3;

export async function TarjetaTarea({ tarea, nombres, etapas, hoy, conEtapa = true, arrastrable = false, equipoNombre }: {
  tarea: Tarea; nombres: Record<string, string>; etapas: Etapa[]; hoy: Date; conEtapa?: boolean; arrastrable?: boolean;
  /** En las vistas que mezclan equipos, de cuál es esta tarjeta. */
  equipoNombre?: string;
}) {
  const t = await getTranslations('tarjeta');
  const idioma = idiomaValido(await getLocale());
  const terminada = !!tarea.terminadoEn;
  return (
    <TarjetaAnimada id={tarea.id} etapaId={arrastrable ? tarea.etapaId : undefined}>
    <article className={`tarjeta group relative p-3 transition-colors hover:border-acento/50 ${terminada ? 'opacity-70' : ''}`}>
      <Link href={`/e/${tarea.equipoId}/t/${tarea.id}`} className="absolute inset-0 rounded-xl" aria-label={tarea.titulo} draggable={false} />
      {equipoNombre && (
        <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400"><Users size={10} /> {equipoNombre}</p>
      )}
      <div className="flex items-start gap-2">
        {tarea.prioridad === 'alta' && <Flag size={14} className="mt-0.5 shrink-0 fill-red-500 text-red-500" aria-label={t('prioridadAlta')} />}
        <h3 className={`min-w-0 flex-1 text-sm font-medium leading-snug text-gray-800 ${terminada ? 'line-through' : ''}`}>{tarea.titulo}</h3>
      </div>
      {tarea.etiquetas.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tarea.etiquetas.map((e) => <span key={e} className="rounded-md bg-acento/10 px-1.5 py-0.5 text-[10px] font-semibold text-acento">#{e}</span>)}
        </div>
      )}
      {tarea.enlaces.length > 0 && (
        <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1">
          {tarea.enlaces.slice(0, MAX_ENLACES).map((e) => (
            <Tooltip key={e.url} texto={e.url}>
              <a href={e.url} target="_blank" rel="noopener noreferrer" draggable={false} className="inline-flex max-w-40 items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-acento/10 hover:text-acento">
                <Link2 size={10} className="shrink-0" /> <span className="truncate">{e.nombre || etiquetaEnlace(e.url)}</span>
              </a>
            </Tooltip>
          ))}
          {tarea.enlaces.length > MAX_ENLACES && <span className="text-[10px] text-gray-400">+{tarea.enlaces.length - MAX_ENLACES}</span>}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <ChipFecha iso={tarea.fechaLimite} hoy={hoy} idioma={idioma} terminada={terminada} />
        {(tarea.comentarios > 0 || tarea.adjuntos > 0 || tarea.vinculadas > 0) && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            {tarea.comentarios > 0 && <span className="flex items-center gap-0.5"><MessageSquare size={11} /> {tarea.comentarios}</span>}
            {tarea.adjuntos > 0 && <span className="flex items-center gap-0.5"><Paperclip size={11} /> {tarea.adjuntos}</span>}
            {tarea.vinculadas > 0 && (
              <Tooltip texto={t('vinculada', { n: tarea.vinculadas })} className="relative z-10">
                <span className="flex items-center gap-0.5 text-acento/80"><Copy size={11} /> {tarea.vinculadas + 1}</span>
              </Tooltip>
            )}
          </span>
        )}
        {!conEtapa && <AccionesTarjeta tareaId={tarea.id} prioridad={tarea.prioridad} />}
        <span className="relative z-10 ml-auto flex -space-x-1.5">
          {tarea.asignados.map((a) => <Avatar key={a} nombre={nombres[a] ?? a} tam="sm" />)}
        </span>
      </div>
      {conEtapa && (
        <div className="relative z-10 mt-2 flex items-center justify-between">
          {/* Los atajos abajo a la izquierda, frente al desplegable de etapa: ahí no tapan nada. */}
          <AccionesTarjeta tareaId={tarea.id} prioridad={tarea.prioridad} />
          <SelectorEtapa tareaId={tarea.id} etapaId={tarea.etapaId} etapas={etapas} />
        </div>
      )}
    </article>
    </TarjetaAnimada>
  );
}
