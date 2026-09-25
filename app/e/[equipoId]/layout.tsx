import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { equipo } from '@/lib/repositorio';
import { Avatar } from '@/components/Avatar';
import { BotonSalir } from '@/components/BotonSalir';
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
      <header data-cabecera className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <Link href="/" className="flex items-center"><Marca alto={26} /></Link>
          <span className="text-gray-300">/</span>
          <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-gray-800">{e.personal && <UserRound size={15} className="shrink-0 text-acento" />}{e.nombre}</span>
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
            <Ajustes />
            <Link href="/cuenta" className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-gray-100" aria-label={tc('cuenta')}>
              <Avatar nombre={u.nombre} tam="sm" sinTooltip />
              <span className="hidden sm:inline">{u.nombre}</span>
            </Link>
            <BotonSalir />
          </div>
          <div className="min-w-0 basis-full">
            <NavEquipo equipoId={equipoId} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
