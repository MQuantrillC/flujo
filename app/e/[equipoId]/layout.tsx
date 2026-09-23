import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { equipo } from '@/lib/repositorio';
import { salir } from '@/lib/acciones';
import { Avatar } from '@/components/Avatar';
import { NavEquipo } from '@/components/NavEquipo';
import { Ajustes } from '@/components/Ajustes';
import { Marca } from '@/components/Marca';

export const dynamic = 'force-dynamic';

export default async function LayoutEquipo({ children, params }: { children: React.ReactNode; params: Promise<{ equipoId: string }> }) {
  const { equipoId } = await params;
  const u = await miembroActual(equipoId);
  const e = equipo(equipoId);
  if (!e) notFound();
  const tc = await getTranslations('comun');

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href="/" className="flex items-center"><Marca alto={26} /></Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">{e.nombre}</span>
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
            <Ajustes />
            <Avatar nombre={u.nombre} tam="sm" />
            <span className="hidden sm:inline">{u.nombre}</span>
            <form action={salir}><button className="text-gray-400 hover:text-gray-700">{tc('salir')}</button></form>
          </div>
          <div className="basis-full">
            <NavEquipo equipoId={equipoId} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
