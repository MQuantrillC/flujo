'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const VISTAS = ['tablero', 'mio', 'semana', 'persona'] as const;

export function NavEquipo({ equipoId }: { equipoId: string }) {
  const t = useTranslations('nav');
  const ruta = usePathname();
  const params = useSearchParams();
  const base = `/e/${equipoId}`;
  const enTablero = ruta === base;
  const vistaActual = params.get('vista') ?? 'tablero';
  const clase = (activo: boolean) =>
    `shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${activo ? 'bg-acento/10 text-acento' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`;

  return (
    <nav className="sin-barra -mx-1 flex items-center gap-1 overflow-x-auto px-1">
      {VISTAS.map((v) => (
        <Link key={v} href={v === 'tablero' ? base : `${base}?vista=${v}`} className={clase(enTablero && vistaActual === v)}>
          {t(v)}
        </Link>
      ))}
      <Link href={`${base}/importar`} className={clase(ruta.startsWith(`${base}/importar`))}>{t('importar')}</Link>
      <Link href={`${base}/ajustes`} className={clase(ruta.startsWith(`${base}/ajustes`))}>{t('ajustes')}</Link>
    </nav>
  );
}
