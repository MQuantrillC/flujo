import Link from 'next/link';
import { ChevronRight, Plus, UserRound, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { usuarioActual } from '@/lib/auth';
import { equiposDe, etapasDeEquipos, miembrosDe, tareasAbiertasDe, tareasDe } from '@/lib/repositorio';
import { crearEquipoAccion, crearEspacioPersonalAccion } from '@/lib/acciones';
import { agruparPorPlazo, etiquetasEnUso } from '@/lib/vistas';
import { nombresCortos } from '@/lib/nombres';
import { hoyActual } from '@/lib/hoy';
import { Avatar } from '@/components/Avatar';
import { Ajustes } from '@/components/Ajustes';
import { BarraRapida } from '@/components/BarraRapida';
import { BotonSalir } from '@/components/BotonSalir';
import { Filas } from '@/components/Filas';
import { GrupoAnimado } from '@/components/Animado';
import { Marca } from '@/components/Marca';
import { TarjetaTarea } from '@/components/TarjetaTarea';
import BlurText from '@/components/reactbits/BlurText';

export const dynamic = 'force-dynamic';

/**
 * El inicio: la línea rápida (a tu espacio personal), tus equipos a mano, y
 * debajo todo lo tuyo de todos los equipos agrupado por plazo.
 */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const u = await usuarioActual();
  const { error } = await searchParams;
  const t = await getTranslations('inicio');
  const tt = await getTranslations('tablero');
  const tc = await getTranslations('comun');
  const equipos = equiposDe(u.email);
  const personal = equipos.find((e) => e.personal && e.creadoPor === u.email) ?? null;
  const hoy = await hoyActual();

  const abiertas = tareasAbiertasDe(u.email);
  const etapasPor = etapasDeEquipos(abiertas.map((x) => x.equipoId));
  const nombres: Record<string, string> = {};
  for (const e of equipos) for (const m of miembrosDe(e.id)) nombres[m.email] = m.nombre;
  const nombreEquipo = Object.fromEntries(equipos.map((e) => [e.id, e.nombre]));
  const grupos = agruparPorPlazo(abiertas, hoy);

  return (
    <GrupoAnimado>
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1><Marca alto={30} /></h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Ajustes />
          <Link href="/cuenta" className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-gray-100" aria-label={tc('cuenta')}>
            <Avatar nombre={u.nombre} sinTooltip />
            <span className="hidden sm:inline">{u.nombre}</span>
          </Link>
          <BotonSalir />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {personal ? (
          <BarraRapida equipoId={personal.id} miembros={miembrosDe(personal.id)} etiquetas={etiquetasEnUso(tareasDe(personal.id)).map((e) => e.etiqueta)} nota={t('rapidaPersonal')} />
        ) : (
          <section className="tarjeta flex flex-wrap items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-acento/10 text-acento"><UserRound size={20} /></span>
            <p className="min-w-0 flex-1 text-sm text-gray-600">{t('personalAyuda')}</p>
            <form action={crearEspacioPersonalAccion}><button className="boton">{t('crearPersonal')}</button></form>
          </section>
        )}

        {equipos.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{t('tusEquipos')}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {equipos.map((e) => {
                const miembros = miembrosDe(e.id);
                const cortos = nombresCortos(miembros);
                return (
                  <li key={e.id}>
                    <Link href={`/e/${e.id}`} className="tarjeta flex items-center gap-3 p-4 transition-colors hover:border-acento/50">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-acento/10 text-acento">{e.personal ? <UserRound size={20} /> : <Users size={20} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-gray-800">{e.nombre}</span>
                        <span className="block truncate text-xs text-gray-500">{e.personal ? t('tuEspacio') : miembros.map((m) => cortos[m.email]).join(', ')}</span>
                      </span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">{t('loMio')} <span className="font-normal">· {abiertas.length}</span></h2>
          <p className="mb-3 text-sm text-gray-500">{t('loMioAyuda')}</p>
          {grupos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">{t('sinPendientes')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {grupos.map((g) => (
                <section key={g.clave}>
                  <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${g.clave === 'vencidas' ? 'text-red-600' : 'text-gray-500'}`}>{tt(`grupos.${g.clave}`)} · {g.tareas.length}</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {g.tareas.map((x) => <TarjetaTarea key={x.id} tarea={x} nombres={nombres} etapas={etapasPor[x.equipoId] ?? []} hoy={hoy} equipoNombre={nombreEquipo[x.equipoId]} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="tarjeta p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-800"><Plus size={16} className="text-acento" /> <BlurText text={equipos.length ? t('crearOtro') : t('crearPrimero')} delay={60} /></h2>
          <p className="mb-4 text-sm text-gray-500">{t('queEs')}</p>
          <form action={crearEquipoAccion} className="flex flex-col gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">{t('nombreEquipo')}</span>
              <input name="nombre" required className="campo" placeholder={t('ejemploNombre')} autoComplete="off" />
              {error === 'nombre' && <span className="mt-1 block text-xs text-red-600">{t('ponleNombre')}</span>}
            </label>
            <div className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">{t('correos')} <span className="font-normal text-gray-400">{t('correosAyuda')}</span></span>
              <Filas columnas={[{ name: 'correos', type: 'email', placeholder: t('correoPlaceholder'), className: 'max-w-md' }]} inicial={[]} agregar={t('agregarCorreo')} quitar={t('quitarCorreo')} />
            </div>
            <div><button className="boton">{t('crearEquipo')}</button></div>
          </form>
        </section>
      </div>
    </div>
    </GrupoAnimado>
  );
}
