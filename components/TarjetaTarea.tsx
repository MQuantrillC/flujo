import Link from 'next/link';
import { Flag, MessageSquare, Paperclip } from 'lucide-react';
import type { Etapa, Tarea } from '@/lib/modelo';
import { Avatar } from './Avatar';
import { ChipFecha } from './ChipFecha';
import { SelectorEtapa } from './SelectorEtapa';
import { TarjetaAnimada } from './Animado';

export function TarjetaTarea({ tarea, nombres, etapas, hoy, conEtapa = true }: {
  tarea: Tarea; nombres: Record<string, string>; etapas: Etapa[]; hoy: Date; conEtapa?: boolean;
}) {
  const terminada = !!tarea.terminadoEn;
  return (
    <TarjetaAnimada id={tarea.id}>
    <article className={`tarjeta group relative p-3 transition-colors hover:border-acento/50 ${terminada ? 'opacity-70' : ''}`}>
      <Link href={`/e/${tarea.equipoId}/t/${tarea.id}`} className="absolute inset-0 rounded-xl" aria-label={tarea.titulo} />
      <div className="flex items-start gap-2">
        {tarea.prioridad === 'alta' && <Flag size={14} className="mt-0.5 shrink-0 fill-red-500 text-red-500" aria-label="Prioridad alta" />}
        <h3 className={`min-w-0 flex-1 text-sm font-medium leading-snug text-gray-800 ${terminada ? 'line-through' : ''}`}>{tarea.titulo}</h3>
      </div>
      {tarea.etiquetas.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tarea.etiquetas.map((e) => <span key={e} className="rounded-md bg-acento/10 px-1.5 py-0.5 text-[10px] font-semibold text-acento">#{e}</span>)}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <ChipFecha iso={tarea.fechaLimite} hoy={hoy} terminada={terminada} />
        {(tarea.comentarios > 0 || tarea.adjuntos > 0) && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            {tarea.comentarios > 0 && <span className="flex items-center gap-0.5"><MessageSquare size={11} /> {tarea.comentarios}</span>}
            {tarea.adjuntos > 0 && <span className="flex items-center gap-0.5"><Paperclip size={11} /> {tarea.adjuntos}</span>}
          </span>
        )}
        <span className="ml-auto flex -space-x-1.5">
          {tarea.asignados.map((a) => <Avatar key={a} nombre={nombres[a] ?? a} tam="sm" />)}
        </span>
      </div>
      {conEtapa && (
        <div className="relative z-10 mt-2 flex justify-end">
          <SelectorEtapa tareaId={tarea.id} etapaId={tarea.etapaId} etapas={etapas} />
        </div>
      )}
    </article>
    </TarjetaAnimada>
  );
}
