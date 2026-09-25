'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Flag, Trash2 } from 'lucide-react';
import { cambiarPrioridadAccion, eliminarTareaEnSitioAccion } from '@/lib/acciones';
import type { Prioridad } from '@/lib/modelo';
import { FormConfirmar } from './FormConfirmar';
import { Tooltip } from './Tooltip';

/**
 * Los atajos que asoman al pasar el ratón por una tarjeta: marcar o quitar la
 * prioridad alta y borrar el pendiente, sin abrir la ficha. Van abajo a la
 * izquierda, donde no tapan nada. En el móvil no hay «pasar el ratón», así
 * que ahí no se muestran: se hace desde la ficha.
 */
export function AccionesTarjeta({ tareaId, prioridad }: { tareaId: string; prioridad: Prioridad }) {
  const t = useTranslations('tarea');
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [vista, setVista] = useState(prioridad);
  // Si cambió por otro camino (la ficha, otra pestaña), el servidor manda otra prioridad: se adopta.
  const [servidor, setServidor] = useState(prioridad);
  if (servidor !== prioridad) { setServidor(prioridad); setVista(prioridad); }
  const alta = vista === 'alta';

  const alternar = () => {
    const nueva: Prioridad = alta ? 'normal' : 'alta';
    setVista(nueva);
    iniciar(async () => { await cambiarPrioridadAccion(tareaId, nueva); router.refresh(); });
  };

  return (
    <div
      // Visible al pasar el ratón o al llegar con el teclado (focus-visible): un clic no la deja pegada.
      className="relative z-10 hidden items-center gap-0.5 transition-opacity sm:flex sm:opacity-0 sm:has-[:focus-visible]:opacity-100 sm:group-hover:opacity-100"
      draggable={false}
    >
      <Tooltip texto={alta ? t('quitarAlta') : t('marcarAlta')}>
        <button type="button" onClick={alternar} aria-pressed={alta} aria-label={alta ? t('quitarAlta') : t('marcarAlta')} className={`rounded-md p-1 transition-colors hover:bg-gray-100 ${alta ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
          <Flag size={13} className={alta ? 'fill-red-500' : ''} />
        </button>
      </Tooltip>
      {/* El formulario como flex: si no, el botón queda sobre una línea de texto y cae unos píxeles respecto a la bandera. */}
      <FormConfirmar action={eliminarTareaEnSitioAccion} peligro mensaje={t('confirmarBorrar')} boton={t('borrar')} className="flex items-center">
        <input type="hidden" name="tareaId" value={tareaId} />
        <Tooltip texto={t('borrar')}>
          <button className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600" aria-label={t('borrar')}><Trash2 size={13} /></button>
        </Tooltip>
      </FormConfirmar>
    </div>
  );
}
