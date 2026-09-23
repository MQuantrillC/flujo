import Link from 'next/link';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { usuarioActual } from '@/lib/auth';
import { equiposDe, miembrosDe } from '@/lib/repositorio';
import { crearEquipoAccion, salir } from '@/lib/acciones';
import { Avatar } from '@/components/Avatar';
import { Ajustes } from '@/components/Ajustes';
import { Marca } from '@/components/Marca';
import BlurText from '@/components/reactbits/BlurText';

export const dynamic = 'force-dynamic';

export default async function Inicio({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await usuarioActual();
  const { error } = await searchParams;
  const equipos = equiposDe(u.email);
  const t = await getTranslations('inicio');
  const tc = await getTranslations('comun');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1><Marca alto={30} /></h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Ajustes />
          <Avatar nombre={u.nombre} />
          <span>{u.nombre}</span>
          <form action={salir}><button className="text-gray-400 hover:text-gray-700">{tc('salir')}</button></form>
        </div>
      </header>

      {equipos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{t('tusEquipos')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {equipos.map((e) => {
              const miembros = miembrosDe(e.id);
              return (
                <li key={e.id}>
                  <Link href={`/e/${e.id}`} className="tarjeta flex items-center gap-3 p-4 transition-colors hover:border-acento/50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-acento/10 text-acento"><Users size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-gray-800">{e.nombre}</span>
                      <span className="block truncate text-xs text-gray-500">{miembros.map((m) => m.nombre.split(' ')[0]).join(', ')}</span>
                    </span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="tarjeta p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-800"><Plus size={16} className="text-acento" /> <BlurText text={equipos.length ? t('crearOtro') : t('crearPrimero')} delay={60} /></h2>
        <p className="mb-4 text-sm text-gray-500">{t('queEs')}</p>
        <form action={crearEquipoAccion} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">{t('nombreEquipo')}</span>
            <input name="nombre" required className="campo" placeholder={t('ejemploNombre')} autoComplete="off" />
            {error === 'nombre' && <span className="mt-1 block text-xs text-red-600">{t('ponleNombre')}</span>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">{t('correos')} <span className="font-normal text-gray-400">{t('correosAyuda')}</span></span>
            <textarea name="correos" rows={3} className="campo" placeholder="andrea.velarde@xertica.com, harold.suarez@xertica.com" />
          </label>
          <div><button className="boton">{t('crearEquipo')}</button></div>
        </form>
      </section>
    </div>
  );
}
