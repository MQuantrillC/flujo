import { getLocale, getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { equipo, etapasDe, miembrosDe } from '@/lib/repositorio';
import { promptParaIA } from '@/lib/importar';
import { idiomaValido } from '@/lib/idioma';
import { Importador } from '@/components/Importador';

export const dynamic = 'force-dynamic';

export default async function Importar({ params }: { params: Promise<{ equipoId: string }> }) {
  const { equipoId } = await params;
  await miembroActual(equipoId);
  const t = await getTranslations('importar');
  const e = equipo(equipoId)!;
  const miembros = miembrosDe(equipoId);
  const prompt = promptParaIA(e.nombre, miembros, etapasDe(equipoId).map((x) => x.nombre), undefined, idiomaValido(await getLocale()));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-bold text-gray-800">{t('titulo')}</h1>
      <p className="mb-5 text-sm text-gray-500">{t('intro')}</p>
      <Importador equipoId={equipoId} prompt={prompt} miembros={miembros} />
    </div>
  );
}
