import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { correoActual } from '@/lib/auth';
import { Ajustes } from '@/components/Ajustes';
import { FormularioRegistro } from '@/components/FormularioAcceso';
import { Marca } from '@/components/Marca';
import BlurText from '@/components/reactbits/BlurText';

export const dynamic = 'force-dynamic';

export default async function Registro() {
  if (await correoActual()) redirect('/');
  const t = await getTranslations('registro');
  return (
    <div className="grid flex-1 place-items-center px-4 py-8">
      <div className="tarjeta w-full max-w-md p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1><Marca alto={36} /></h1>
          <Ajustes />
        </div>
        <BlurText text={t('titulo')} delay={80} className="mb-5 text-lg font-semibold text-gray-800" />
        <FormularioRegistro />
      </div>
    </div>
  );
}
