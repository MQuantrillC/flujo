'use client';

// Los archivos que alguien va a subir, antes de subirlos: se eligen con el
// botón, se pegan (Ctrl+V) o se arrastran. Lo comparten la línea rápida, los
// comentarios y la ficha del pendiente.

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { extensionPermitida, MAX_MB_ADJUNTO } from '@/lib/adjuntos';

export function useAdjuntos() {
  const te = useTranslations('errores');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Una vista previa por imagen; se liberan cuando cambia la lista.
  const vistas = useMemo(() => archivos.map((a) => (a.type.startsWith('image/') ? URL.createObjectURL(a) : null)), [archivos]);
  useEffect(() => () => vistas.forEach((v) => { if (v) URL.revokeObjectURL(v); }), [vistas]);

  const agregar = (lista: FileList | File[] | null | undefined) => {
    if (!lista) return;
    const nuevos: File[] = [];
    for (const f of Array.from(lista)) {
      // Lo pegado desde el portapapeles llega sin nombre: se le pone uno según el tipo.
      const nombre = f.name || (f.type.startsWith('image/') ? `imagen.${f.type.split('/')[1] || 'png'}` : 'archivo');
      const archivo = f.name ? f : new File([f], nombre, { type: f.type });
      if (!extensionPermitida(archivo.name)) { setError(te('tipoNoPermitido', { nombre: archivo.name })); continue; }
      if (archivo.size > MAX_MB_ADJUNTO * 1024 * 1024) { setError(te('muyGrande', { nombre: archivo.name, mb: MAX_MB_ADJUNTO })); continue; }
      nuevos.push(archivo);
    }
    if (nuevos.length) { setError(null); setArchivos((a) => [...a, ...nuevos]); }
  };
  const quitar = (i: number) => setArchivos((l) => l.filter((_, k) => k !== i));
  const limpiar = () => setArchivos([]);

  /** Para pegar en cualquier campo: si el portapapeles trae archivos, se los queda. */
  const alPegar = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length) { e.preventDefault(); agregar(e.clipboardData.files); }
  };

  /** Sube los archivos a un pendiente, sin comentario. Devuelve la clave de error de messages/errores o null. */
  const subir = async (tareaId: string): Promise<string | null> => {
    if (archivos.length === 0) return null;
    const fd = new FormData();
    archivos.forEach((a) => fd.append('archivos', a, a.name));
    try {
      const r = await fetch(`/api/tareas/${tareaId}/comentarios`, { method: 'POST', body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        return te(j?.error ?? 'generico', { nombre: j?.nombre ?? '', mb: MAX_MB_ADJUNTO });
      }
      return null;
    } catch {
      return te('generico');
    }
  };

  return { archivos, vistas, error, setError, agregar, quitar, limpiar, alPegar, subir };
}
