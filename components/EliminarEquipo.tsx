'use client';

// Borrar un equipo entero. Como no se puede deshacer, el botón sólo se
// activa cuando se escribe el nombre del equipo tal cual, y luego se pregunta.

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { eliminarEquipoAccion } from '@/lib/acciones';
import { FormConfirmar } from './FormConfirmar';

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function EliminarEquipo({ equipoId, nombre }: { equipoId: string; nombre: string }) {
  const t = useTranslations('miembros');
  const [escrito, setEscrito] = useState('');
  const listo = igual(escrito, nombre);
  return (
    <FormConfirmar action={eliminarEquipoAccion} className="flex flex-col gap-2" peligro titulo={t('eliminarEquipo')} boton={t('eliminarBoton', { equipo: nombre })} mensaje={t('confirmarEliminarEquipo', { equipo: nombre })}>
      <input type="hidden" name="equipoId" value={equipoId} />
      <label className="text-xs text-gray-600">
        {t('eliminarEscribe')}
        <input name="confirmacion" value={escrito} onChange={(e) => setEscrito(e.target.value)} placeholder={nombre} autoComplete="off" className="campo mt-1" />
      </label>
      <button disabled={!listo} className="boton-peligro w-fit">
        <Trash2 size={14} /> {t('eliminarBoton', { equipo: nombre })}
      </button>
    </FormConfirmar>
  );
}
