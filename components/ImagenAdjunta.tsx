import { X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Adjunto } from '@/lib/modelo';
import { esImagen } from '@/lib/adjuntos';
import { eliminarAdjuntoAccion } from '@/lib/acciones';
import { FormConfirmar } from './FormConfirmar';
import { VisorImagen } from './VisorImagen';

/**
 * Una miniatura que abre la imagen en el visor de la app, con su botón de
 * quitar. `grupo` son los adjuntos hermanos (del mismo comentario o del mismo
 * pendiente): entre sus imágenes se pasa con las flechas.
 */
export async function ImagenAdjunta({ adjunto, grupo }: { adjunto: Adjunto; grupo?: Adjunto[] }) {
  const t = await getTranslations('comentarios');
  const imagenes = (grupo ?? [adjunto]).filter((a) => esImagen(a.mime)).map((a) => ({ id: a.id, nombre: a.nombre }));
  return (
    <figure className="group relative">
      <VisorImagen imagen={{ id: adjunto.id, nombre: adjunto.nombre }} grupo={imagenes} />
      <FormConfirmar action={eliminarAdjuntoAccion} peligro boton={t('quitar')} mensaje={t('confirmarQuitarImagen')} className="absolute -right-1.5 -top-1.5 hidden group-hover:block">
        <input type="hidden" name="adjuntoId" value={adjunto.id} />
        <button className="rounded-full bg-black/70 p-0.5 text-white" aria-label={t('quitar')}><X size={12} /></button>
      </FormConfirmar>
    </figure>
  );
}
