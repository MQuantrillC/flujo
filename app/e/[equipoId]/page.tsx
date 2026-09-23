import Link from 'next/link';
import { Tag, X } from 'lucide-react';
import { miembroActual } from '@/lib/auth';
import { etapasDe, miembrosDe, tareasDe } from '@/lib/repositorio';
import { agruparPorPersona, agruparPorPlazo, agruparSemana, etiquetasEnUso, ordenarPorPlazo } from '@/lib/vistas';
import { dia, fechaCorta } from '@/lib/fechas';
import type { Tarea } from '@/lib/modelo';
import { BarraRapida } from '@/components/BarraRapida';
import { TarjetaTarea } from '@/components/TarjetaTarea';
import { Avatar } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

const DIAS_HECHAS_VISIBLES = 14;

type Params = Promise<{ equipoId: string }>;
type Busqueda = Promise<{ vista?: string; etiqueta?: string }>;

export default async function PaginaEquipo({ params, searchParams }: { params: Params; searchParams: Busqueda }) {
  const { equipoId } = await params;
  const { vista = 'tablero', etiqueta } = await searchParams;
  const u = await miembroActual(equipoId);
  const etapas = etapasDe(equipoId);
  const miembros = miembrosDe(equipoId);
  const nombres = Object.fromEntries(miembros.map((m) => [m.email, m.nombre]));
  const hoy = dia();
  // En la columna «hecho» sólo se ven las terminadas hace poco; las demás quedan en el historial.
  const corteHechas = hoy.getTime() - DIAS_HECHAS_VISIBLES * 86_400_000;

  const todas = tareasDe(equipoId);
  const conEtiqueta = etiqueta ? todas.filter((t) => t.etiquetas.includes(etiqueta)) : todas;
  const finales = new Set(etapas.filter((e) => e.esFinal).map((e) => e.id));
  const activas = conEtiqueta.filter((t) => !finales.has(t.etapaId));
  const etiquetas = etiquetasEnUso(todas);
  const base = `/e/${equipoId}`;
  const conVista = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const v = extra.vista ?? vista; if (v && v !== 'tablero') q.set('vista', v);
    const e = 'etiqueta' in extra ? extra.etiqueta : etiqueta; if (e) q.set('etiqueta', e);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const tarjeta = (t: Tarea) => <TarjetaTarea key={t.id} tarea={t} nombres={nombres} etapas={etapas} hoy={hoy} />;
  const lista = (tareas: Tarea[]) => <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{tareas.map(tarjeta)}</div>;
  const vacio = (msg: string) => <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">{msg}</p>;

  return (
    <div className="flex flex-col gap-4">
      <BarraRapida equipoId={equipoId} miembros={miembros} />

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Tag size={12} className="text-gray-400" />
          {etiquetas.map((e) => (
            <Link key={e.etiqueta} href={conVista({ etiqueta: e.etiqueta === etiqueta ? undefined : e.etiqueta })}
              className={`rounded-md px-1.5 py-0.5 font-semibold ${e.etiqueta === etiqueta ? 'bg-acento text-white' : 'bg-acento/10 text-acento hover:bg-acento/20'}`}>
              #{e.etiqueta} <span className="opacity-60">{e.n}</span>
            </Link>
          ))}
          {etiqueta && <Link href={conVista({ etiqueta: undefined })} className="flex items-center gap-0.5 text-gray-500 hover:text-gray-800"><X size={12} /> quitar filtro</Link>}
        </div>
      )}

      {vista === 'tablero' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {etapas.map((et) => {
            const tareas = ordenarPorPlazo(conEtiqueta.filter((t) => t.etapaId === et.id && (!et.esFinal || (t.terminadoEn ?? 0) >= corteHechas)));
            return (
              <section key={et.id} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-gray-200/50 p-2">
                <h2 className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {et.nombre} <span className="rounded-full bg-white px-1.5 text-[10px] text-gray-500">{tareas.length}</span>
                </h2>
                {tareas.map(tarjeta)}
                {tareas.length === 0 && <p className="px-1 py-4 text-center text-xs text-gray-400">{et.esFinal ? `Nada en los últimos ${DIAS_HECHAS_VISIBLES} días` : 'Nada aquí'}</p>}
              </section>
            );
          })}
        </div>
      )}

      {vista === 'mio' && (() => {
        const mias = activas.filter((t) => t.asignados.includes(u.email));
        const grupos = agruparPorPlazo(mias, hoy);
        return grupos.length === 0 ? vacio('No tienes pendientes abiertos. Escribe uno arriba con @' + u.nombre.split(' ')[0].toLowerCase() + '.') : grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className={`mb-2 text-xs font-bold uppercase tracking-wider ${g.titulo === 'Vencidas' ? 'text-red-600' : 'text-gray-500'}`}>{g.titulo} · {g.tareas.length}</h2>
            {lista(g.tareas)}
          </section>
        ));
      })()}

      {vista === 'semana' && (() => {
        const grupos = agruparSemana(activas, hoy);
        return grupos.length === 0 ? vacio('Nada vence esta semana.') : grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className={`mb-2 text-xs font-bold uppercase tracking-wider ${g.titulo === 'Vencidas' ? 'text-red-600' : 'text-gray-500'}`}>
              {g.titulo === 'Vencidas' ? 'Vencidas' : fechaCorta(g.titulo, hoy)} · {g.tareas.length}
            </h2>
            {lista(g.tareas)}
          </section>
        ));
      })()}

      {vista === 'persona' && (() => {
        const grupos = agruparPorPersona(activas, miembros);
        return grupos.length === 0 ? vacio('No hay pendientes abiertos.') : grupos.map((g) => (
          <section key={g.email ?? '-'}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              {g.email ? <Avatar nombre={g.nombre} tam="sm" /> : null}{g.nombre} <span className="text-xs font-normal text-gray-400">{g.tareas.length}</span>
            </h2>
            {lista(g.tareas)}
          </section>
        ));
      })()}
    </div>
  );
}
