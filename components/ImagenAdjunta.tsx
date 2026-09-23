import { X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Adjunto } from '@/lib/modelo';
import { eliminarAdjuntoAccion } from '@/lib/acciones';
import { FormConfirmar } from './FormConfirmar';

/** Una miniatura que abre la imagen completa en otra pestaña, con su botón de quitar. */
export async function ImagenAdjunta({ adjunto }: { adjunto: Adjunto }) {
  const t = await getTranslations('comentarios');
  const url = `/api/adjuntos/${adjunto.id}`;
  return (
    <figure className="group relative">
      <a href={url} target="_blank" rel="noopener" title={adjunto.nombre}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={adjunto.nombre} className="h-28 w-28 rounded-lg border border-gray-200 object-cover transition-transform hover:scale-[1.02]" loading="lazy" />
      </a>
      <FormConfirmar action={eliminarAdjuntoAccion} mensaje={t('confirmarQuitarImagen')} className="absolute -right-1.5 -top-1.5 hidden group-hover:block">
        <input type="hidden" name="adjuntoId" value={adjunto.id} />
        <button className="rounded-full bg-black/70 p-0.5 text-white" title={t('quitar')}><X size={12} /></button>
      </FormConfirmar>
    </figure>
  );
}
