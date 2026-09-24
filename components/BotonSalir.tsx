import { LogOut } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { salir } from '@/lib/acciones';
import { Tooltip } from './Tooltip';

/** Salir, como icono: mide lo mismo en los tres idiomas y la cabecera no se mueve al cambiarlo. */
export async function BotonSalir() {
  const tc = await getTranslations('comun');
  return (
    <form action={salir} className="flex">
      <Tooltip texto={tc('salir')}>
        <button aria-label={tc('salir')} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"><LogOut size={16} /></button>
      </Tooltip>
    </form>
  );
}
