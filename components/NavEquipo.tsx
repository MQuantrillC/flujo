'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const VISTAS = [
  { vista: 'tablero', nombre: 'Tablero' },
  { vista: 'mio', nombre: 'Lo mío' },
  { vista: 'semana', nombre: 'Esta semana' },
  { vista: 'persona', nombre: 'Por persona' },
];

export function NavEquipo({ equipoId }: { equipoId: string }) {
  const ruta = usePathname();
  const params = useSearchParams();
  const base = `/e/${equipoId}`;
  const enTablero = ruta === base;
  const vistaActual = params.get('vista') ?? 'tablero';
  const clase = (activo: boolean) =>
    `rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${activo ? 'bg-acento/10 text-acento' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {VISTAS.map((v) => (
        <Link key={v.vista} href={v.vista === 'tablero' ? base : `${base}?vista=${v.vista}`} className={clase(enTablero && vistaActual === v.vista)}>
          {v.nombre}
        </Link>
      ))}
      <Link href={`${base}/miembros`} className={clase(ruta.startsWith(`${base}/miembros`))}>Miembros</Link>
    </nav>
  );
}
