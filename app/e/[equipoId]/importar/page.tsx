import { miembroActual } from '@/lib/auth';
import { equipo, etapasDe, miembrosDe } from '@/lib/repositorio';
import { promptParaIA } from '@/lib/importar';
import { Importador } from '@/components/Importador';

export const dynamic = 'force-dynamic';

export default async function Importar({ params }: { params: Promise<{ equipoId: string }> }) {
  const { equipoId } = await params;
  await miembroActual(equipoId);
  const e = equipo(equipoId)!;
  const miembros = miembrosDe(equipoId);
  const prompt = promptParaIA(e.nombre, miembros, etapasDe(equipoId).map((x) => x.nombre));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-bold text-gray-800">Importar pendientes</h1>
      <p className="mb-5 text-sm text-gray-500">Para traer de golpe una lista que ya tienes en otro lado: una hoja de cálculo, un documento, notas de una reunión.</p>
      <Importador equipoId={equipoId} prompt={prompt} miembros={miembros} />
    </div>
  );
}
