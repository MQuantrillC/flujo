import { FileArchive, FileSpreadsheet, FileText, File as FileIcon, Presentation, X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Adjunto } from '@/lib/modelo';
import { claseDe, esImagen, tamanoLegible, type ClaseAdjunto } from '@/lib/adjuntos';
import { eliminarAdjuntoAccion } from '@/lib/acciones';
import { FormConfirmar } from './FormConfirmar';
import { ImagenAdjunta } from './ImagenAdjunta';
import { Tooltip } from './Tooltip';

const ICONO: Record<ClaseAdjunto, { Icono: typeof FileIcon; color: string }> = {
  imagen: { Icono: FileIcon, color: 'text-gray-500' },
  pdf: { Icono: FileText, color: 'text-red-500' },
  documento: { Icono: FileText, color: 'text-sky-800' },
  hoja: { Icono: FileSpreadsheet, color: 'text-emerald-700' },
  presentacion: { Icono: Presentation, color: 'text-amber-700' },
  texto: { Icono: FileText, color: 'text-gray-500' },
  comprimido: { Icono: FileArchive, color: 'text-violet-800' },
  otro: { Icono: FileIcon, color: 'text-gray-500' },
};

/** Un adjunto: miniatura si es imagen; si no, una ficha con icono, nombre y peso que lo descarga. */
export async function AdjuntoVista({ adjunto }: { adjunto: Adjunto }) {
  if (esImagen(adjunto.mime)) return <ImagenAdjunta adjunto={adjunto} />;
  const t = await getTranslations('comentarios');
  const { Icono, color } = ICONO[claseDe(adjunto.nombre, adjunto.mime)];
  return (
    <div className="group relative">
      <a href={`/api/adjuntos/${adjunto.id}`} className="flex max-w-64 items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-acento/60 hover:bg-acento/5">
        <Icono size={20} className={`shrink-0 ${color}`} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-gray-800">{adjunto.nombre}</span>
          <span className="block text-[11px] text-gray-400">{tamanoLegible(adjunto.tamano)}</span>
        </span>
      </a>
      <FormConfirmar action={eliminarAdjuntoAccion} peligro boton={t('quitar')} mensaje={t('confirmarQuitarArchivo', { nombre: adjunto.nombre })} className="absolute -right-1.5 -top-1.5 hidden group-hover:block">
        <input type="hidden" name="adjuntoId" value={adjunto.id} />
        <Tooltip texto={t('quitar')}><button className="rounded-full bg-black/70 p-0.5 text-white" aria-label={t('quitar')}><X size={12} /></button></Tooltip>
      </FormConfirmar>
    </div>
  );
}
