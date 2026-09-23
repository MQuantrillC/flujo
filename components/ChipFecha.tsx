import { CalendarDays } from 'lucide-react';
import { diasHasta, fechaCorta } from '@/lib/fechas';
import type { Idioma } from '@/lib/idioma';

/** La fecha límite en una pastilla: roja si venció, ámbar si es hoy o mañana, gris si hay tiempo. */
export function ChipFecha({ iso, hoy, idioma = 'es', terminada = false }: { iso: string | null; hoy: Date; idioma?: Idioma; terminada?: boolean }) {
  if (!iso) return null;
  const n = diasHasta(iso, hoy);
  const color = terminada ? 'bg-gray-100 text-gray-500'
    : n < 0 ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
    : n <= 1 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
    : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${color}`}>
      <CalendarDays size={11} /> {fechaCorta(iso, hoy, idioma)}
    </span>
  );
}
