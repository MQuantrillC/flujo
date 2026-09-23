import { redirect } from 'next/navigation';
import { correoActual, esProduccion } from '@/lib/auth';
import { entrar } from '@/lib/acciones';

export const dynamic = 'force-dynamic';

export default async function Entrar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await correoActual()) redirect('/');
  const { error } = await searchParams;

  return (
    <div className="grid flex-1 place-items-center px-4">
      <div className="tarjeta w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold tracking-tight text-acento">Flujo</h1>
        <p className="mb-5 mt-1 text-sm text-gray-500">Pendientes del equipo, en una línea.</p>
        {esProduccion() ? (
          <p className="text-sm text-gray-600">No se pudo saber quién eres. El acceso se hace con tu cuenta de Google de Xertica.</p>
        ) : (
          <form action={entrar} className="flex flex-col gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Tu correo</span>
              <input name="email" type="email" required autoFocus className="campo" placeholder="nombre.apellido@xertica.com" />
              {error === 'correo' && <span className="mt-1 block text-xs text-red-600">Escribe un correo válido.</span>}
            </label>
            <button className="boton justify-center">Entrar</button>
            <p className="text-xs text-gray-400">Mientras Flujo corre en una máquina, basta con el correo. En la nube entrará con Google.</p>
          </form>
        )}
      </div>
    </div>
  );
}
