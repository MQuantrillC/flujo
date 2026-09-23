import Link from 'next/link';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { usuarioActual } from '@/lib/auth';
import { equiposDe, miembrosDe } from '@/lib/repositorio';
import { crearEquipoAccion, salir } from '@/lib/acciones';
import { Avatar } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function Inicio({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await usuarioActual();
  const { error } = await searchParams;
  const equipos = equiposDe(u.email);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-acento">Flujo</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Avatar nombre={u.nombre} />
          <span>{u.nombre}</span>
          <form action={salir}><button className="text-gray-400 hover:text-gray-700">salir</button></form>
        </div>
      </header>

      {equipos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Tus equipos</h2>
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
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-800"><Plus size={16} className="text-acento" /> {equipos.length ? 'Crear otro equipo' : 'Crea tu primer equipo'}</h2>
        <p className="mb-4 text-sm text-gray-500">Un equipo es un grupo de personas con sus pendientes. Tú entras automáticamente.</p>
        <form action={crearEquipoAccion} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Nombre del equipo</span>
            <input name="nombre" required className="campo" placeholder="Ej. Comercial Perú" autoComplete="off" />
            {error === 'nombre' && <span className="mt-1 block text-xs text-red-600">Ponle un nombre.</span>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Correos de los miembros <span className="font-normal text-gray-400">(separados por coma, espacio o línea; puedes agregar más después)</span></span>
            <textarea name="correos" rows={3} className="campo" placeholder="andrea.velarde@xertica.com, harold.suarez@xertica.com" />
          </label>
          <div><button className="boton">Crear equipo</button></div>
        </form>
      </section>
    </div>
  );
}
