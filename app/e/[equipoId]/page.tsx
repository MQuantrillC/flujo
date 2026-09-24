import Link from 'next/link';
import { Tag, X } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { etapasDe, miembrosDe, tareasDe } from '@/lib/repositorio';
import { agruparPorPersona, agruparPorPlazo, agruparSemana, etiquetasEnUso, ordenarPorPlazo } from '@/lib/vistas';
import { fechaCorta } from '@/lib/fechas';
import { hoyActual } from '@/lib/hoy';
import { idiomaValido } from '@/lib/idioma';
import type { Tarea } from '@/lib/modelo';
import { BarraRapida } from '@/components/BarraRapida';
import { TarjetaTarea } from '@/components/TarjetaTarea';
import { Avatar } from '@/components/Avatar';
import { GrupoAnimado } from '@/components/Animado';
import { ColumnaTablero } from '@/components/ColumnaTablero';

export const dynamic = 'force-dynamic';

const DIAS_HECHAS_VISIBLES = 14;

type Params = Promise<{ equipoId: string }>;
type Busqueda = Promise<{ vista?: string; etiqueta?: string }>;

export default async function PaginaEquipo({ params, searchParams }: { params: Params; searchParams: Busqueda }) {
  const { equipoId } = await params;
  const { vista = 'tablero', etiqueta } = await searchParams;
  const u = await miembroActual(equipoId);
  const t = await getTranslations('tablero');
  const idioma = idiomaValido(await getLocale());
  const etapas = etapasDe(equipoId);
  const miembros = miembrosDe(equipoId);
  const nombres = Object.fromEntries(miembros.map((m) => [m.email, m.nombre]));
  const hoy = await hoyActual();
  // En la columna «hecho» sólo se ven las terminadas hace poco; las demás quedan en el historial.
  const corteHechas = hoy.getTime() - DIAS_HECHAS_VISIBLES * 86_400_000;

  const todas = tareasDe(equipoId);
  const conEtiqueta = etiqueta ? todas.filter((x) => x.etiquetas.includes(etiqueta)) : todas;
  const finales = new Set(etapas.filter((e) => e.esFinal).map((e) => e.id));
  const activas = conEtiqueta.filter((x) => !finales.has(x.etapaId));
  const etiquetas = etiquetasEnUso(todas);
  const base = `/e/${equipoId}`;
  const conVista = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const v = extra.vista ?? vista; if (v && v !== 'tablero') q.set('vista', v);
    const e = 'etiqueta' in extra ? extra.etiqueta : etiqueta; if (e) q.set('etiqueta', e);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const tarjeta = (x: Tarea) => <TarjetaTarea key={x.id} tarea={x} nombres={nombres} etapas={etapas} hoy={hoy} />;
  const lista = (tareas: Tarea[]) => <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{tareas.map(tarjeta)}</div>;
  const vacio = (msg: string) => <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">{msg}</p>;
  const tituloGrupo = (clave: string) => (/^\d{4}-\d{2}-\d{2}$/.test(clave) ? fechaCorta(clave, hoy, idioma) : t(`grupos.${clave}`));

  return (
    <GrupoAnimado>
    <div className="flex flex-col gap-4">
      <BarraRapida equipoId={equipoId} miembros={miembros} etiquetas={etiquetas.map((e) => e.etiqueta)} />

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Tag size={12} className="text-gray-400" />
          {etiquetas.map((e) => (
            <Link key={e.etiqueta} href={conVista({ etiqueta: e.etiqueta === etiqueta ? undefined : e.etiqueta })}
              className={`rounded-md px-1.5 py-0.5 font-semibold ${e.etiqueta === etiqueta ? 'bg-acento text-white dark:text-gray-900' : 'bg-acento/10 text-acento hover:bg-acento/20'}`}>
              #{e.etiqueta} <span className="opacity-60">{e.n}</span>
            </Link>
          ))}
          {etiqueta && <Link href={conVista({ etiqueta: undefined })} className="flex items-center gap-0.5 text-gray-500 hover:text-gray-800"><X size={12} /> {t('quitarFiltro')}</Link>}
        </div>
      )}

      {vista === 'tablero' && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:snap-none sm:px-0">
          {etapas.map((et) => {
            const tareas = ordenarPorPlazo(conEtiqueta.filter((x) => x.etapaId === et.id && (!et.esFinal || (x.terminadoEn ?? 0) >= corteHechas)));
            return (
              <ColumnaTablero key={et.id} etapaId={et.id} nombre={et.nombre} cantidad={tareas.length} vacio={et.esFinal ? t('nadaHechas', { dias: DIAS_HECHAS_VISIBLES }) : t('nadaAqui')}>
                {tareas.map((x) => <TarjetaTarea key={x.id} tarea={x} nombres={nombres} etapas={etapas} hoy={hoy} arrastrable />)}
              </ColumnaTablero>
            );
          })}
        </div>
      )}

      {vista === 'mio' && (() => {
        const grupos = agruparPorPlazo(activas.filter((x) => x.asignados.includes(u.email)), hoy);
        return grupos.length === 0 ? vacio(t('sinMios', { alias: u.nombre.split(' ')[0].toLowerCase() })) : grupos.map((g) => (
          <section key={g.clave}>
            <h2 className={`mb-2 text-xs font-bold uppercase tracking-wider ${g.clave === 'vencidas' ? 'text-red-600' : 'text-gray-500'}`}>{tituloGrupo(g.clave)} · {g.tareas.length}</h2>
            {lista(g.tareas)}
          </section>
        ));
      })()}

      {vista === 'semana' && (() => {
        const grupos = agruparSemana(activas, hoy);
        return grupos.length === 0 ? vacio(t('nadaSemana')) : grupos.map((g) => (
          <section key={g.clave}>
            <h2 className={`mb-2 text-xs font-bold uppercase tracking-wider ${g.clave === 'vencidas' ? 'text-red-600' : 'text-gray-500'}`}>{tituloGrupo(g.clave)} · {g.tareas.length}</h2>
            {lista(g.tareas)}
          </section>
        ));
      })()}

      {vista === 'persona' && (() => {
        const grupos = agruparPorPersona(activas, miembros);
        return grupos.length === 0 ? vacio(t('nadaAbierto')) : grupos.map((g) => (
          <section key={g.email ?? '-'}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              {g.email ? <Avatar nombre={g.nombre} tam="sm" /> : null}{g.email ? g.nombre : t('sinResponsable')} <span className="text-xs font-normal text-gray-400">{g.tareas.length}</span>
            </h2>
            {lista(g.tareas)}
          </section>
        ));
      })()}
    </div>
    </GrupoAnimado>
  );
}
