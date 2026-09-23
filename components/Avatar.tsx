import { iniciales } from '@/lib/modelo';

const COLORES = ['bg-sky-100 text-sky-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800', 'bg-teal-100 text-teal-800'];

/** Un círculo con las iniciales; el color sale del nombre, así cada persona tiene siempre el mismo. */
export function Avatar({ nombre, tam = 'md', title }: { nombre: string; tam?: 'sm' | 'md'; title?: string }) {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const color = COLORES[h % COLORES.length];
  const clase = tam === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span title={title ?? nombre} className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${clase} ${color}`}>
      {iniciales(nombre)}
    </span>
  );
}
