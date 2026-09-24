import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { correoActual } from '@/lib/auth';
import { Ajustes } from '@/components/Ajustes';
import { FormularioRegistro } from '@/components/FormularioAcceso';
import { Marca } from '@/components/Marca';
import BlurText from '@/components/reactbits/BlurText';

export const dynamic = 'force-dynamic';

export default async function Registro({ searchParams }: { searchParams: Promise<{ correo?: string; equipo?: string }> }) {
  if (await correoActual()) redirect('/');
  const { correo, equipo } = await searchParams;
  const t = await getTranslations('registro');
  return (
    <div className="grid flex-1 place-items-center px-4 py-8">
      <div className="tarjeta w-full max-w-md p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1><Marca alto={36} /></h1>
          <Ajustes />
        </div>
        <BlurText text={t('titulo')} delay={80} className="mb-5 text-lg font-semibold text-gray-800" />
        {correo && equipo && <p className="mb-4 rounded-lg bg-acento/10 px-3 py-2 text-sm text-gray-700">{t.rich('invitado', { equipo, b: (c) => <b>{c}</b> })}</p>}
        <FormularioRegistro correoInicial={correo ?? ''} />
      </div>
    </div>
  );
}
