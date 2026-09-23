import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { correoActual, esProduccion } from '@/lib/auth';
import { entrar } from '@/lib/acciones';
import { Ajustes } from '@/components/Ajustes';
import { Marca } from '@/components/Marca';
import BlurText from '@/components/reactbits/BlurText';

export const dynamic = 'force-dynamic';

export default async function Entrar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await correoActual()) redirect('/');
  const { error } = await searchParams;
  const t = await getTranslations('entrar');

  return (
    <div className="grid flex-1 place-items-center px-4">
      <div className="tarjeta w-full max-w-sm p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1><Marca alto={36} /></h1>
          <Ajustes />
        </div>
        <BlurText text={t('lema')} delay={80} className="mb-5 text-sm text-gray-500" />
        {esProduccion() ? (
          <p className="text-sm text-gray-600">{t('sinIdentidad')}</p>
        ) : (
          <form action={entrar} className="flex flex-col gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">{t('tuCorreo')}</span>
              <input name="email" type="email" required autoFocus className="campo" placeholder="nombre.apellido@xertica.com" />
              {error === 'correo' && <span className="mt-1 block text-xs text-red-600">{t('correoInvalido')}</span>}
            </label>
            <button className="boton justify-center">{t('entrar')}</button>
            <p className="text-xs text-gray-400">{t('nota')}</p>
          </form>
        )}
      </div>
    </div>
  );
}
