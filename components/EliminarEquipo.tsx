'use client';

// Borrar un equipo entero. Como no se puede deshacer, el botón sólo se
// activa cuando se escribe el nombre del equipo tal cual.

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { eliminarEquipoAccion } from '@/lib/acciones';

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function EliminarEquipo({ equipoId, nombre }: { equipoId: string; nombre: string }) {
  const t = useTranslations('miembros');
  const [escrito, setEscrito] = useState('');
  const listo = igual(escrito, nombre);
  return (
    <form action={eliminarEquipoAccion} className="flex flex-col gap-2" onSubmit={(e) => { if (!listo || !confirm(t('confirmarEliminarEquipo', { equipo: nombre }))) e.preventDefault(); }}>
      <input type="hidden" name="equipoId" value={equipoId} />
      <label className="text-xs text-gray-600">
        {t('eliminarEscribe')}
        <input name="confirmacion" value={escrito} onChange={(e) => setEscrito(e.target.value)} placeholder={nombre} autoComplete="off" className="campo mt-1" />
      </label>
      <button disabled={!listo} className="boton w-fit border-red-600 bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
        <Trash2 size={14} /> {t('eliminarBoton', { equipo: nombre })}
      </button>
    </form>
  );
}
