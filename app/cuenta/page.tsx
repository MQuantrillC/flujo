import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { usuarioActual } from '@/lib/auth';
import { salir } from '@/lib/acciones';
import { Ajustes } from '@/components/Ajustes';
import { Avatar } from '@/components/Avatar';
import { FormularioContrasena, FormularioPerfil } from '@/components/FormulariosCuenta';
import { Marca } from '@/components/Marca';

export const dynamic = 'force-dynamic';

export default async function Cuenta() {
  const u = await usuarioActual();
  const t = await getTranslations('cuenta');
  const tc = await getTranslations('comun');
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center"><Marca alto={30} /></Link>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Ajustes />
          <form action={salir}><button className="text-gray-400 hover:text-gray-700">{tc('salir')}</button></form>
        </div>
      </header>
      <Link href="/" className="mb-4 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> {tc('volverInicio')}</Link>
      <div className="mb-5 flex items-center gap-3">
        <Avatar nombre={u.nombre} sinTooltip />
        <div>
          <h1 className="text-xl font-bold text-gray-800">{t('titulo')}</h1>
          <p className="text-sm text-gray-500">{u.email}</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="tarjeta p-5">
          <h2 className="mb-3 font-semibold text-gray-800">{t('datos')}</h2>
          <FormularioPerfil usuario={u} />
        </section>
        <section className="tarjeta p-5">
          <h2 className="mb-3 font-semibold text-gray-800">{t('contrasenaTitulo')}</h2>
          <FormularioContrasena />
        </section>
      </div>
    </div>
  );
}
