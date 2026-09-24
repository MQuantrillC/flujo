import { ArrowDown, ArrowUp, Check, Trash2, UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { equipo, etapasDe, miembrosDe, tareasDe } from '@/lib/repositorio';
import {
  agregarEtapaAccion, agregarMiembroAccion, eliminarEtapaAccion, marcarEtapaFinalAccion, moverEtapaAccion,
  quitarMiembroAccion, renombrarEquipoAccion, renombrarEtapaAccion,
} from '@/lib/acciones';
import { Avatar } from '@/components/Avatar';
import { FormConfirmar } from '@/components/FormConfirmar';
import { Tooltip } from '@/components/Tooltip';

export const dynamic = 'force-dynamic';

export default async function Miembros({ params }: { params: Promise<{ equipoId: string }> }) {
  const { equipoId } = await params;
  const u = await miembroActual(equipoId);
  const t = await getTranslations('miembros');
  const tc = await getTranslations('comun');
  const e = equipo(equipoId)!;
  const miembros = miembrosDe(equipoId);
  const etapas = etapasDe(equipoId);
  const tareas = tareasDe(equipoId);
  const enUso = (etapaId: string) => tareas.filter((x) => x.etapaId === etapaId).length;
  const botonIcono = 'rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 disabled:opacity-30';

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="tarjeta p-5">
        <h2 className="mb-3 font-semibold text-gray-800">{t('equipo')}</h2>
        <form action={renombrarEquipoAccion} className="flex gap-2">
          <input type="hidden" name="equipoId" value={equipoId} />
          <input name="nombre" defaultValue={e.nombre} className="campo" />
          <button className="boton-suave"><Check size={14} /> {tc('guardar')}</button>
        </form>

        <h2 className="mb-3 mt-8 font-semibold text-gray-800">{t('miembros')} <span className="text-sm font-normal text-gray-400">{miembros.length}</span></h2>
        <ul className="divide-y divide-gray-100">
          {miembros.map((m) => (
            <li key={m.email} className="flex items-center gap-3 py-2">
              <Avatar nombre={m.nombre} sinTooltip />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-gray-800">
                  {m.nombre}
                  {m.email === u.email && <span className="text-xs font-normal text-gray-400">{t('tu')}</span>}
                  {!m.tieneCuenta && (
                    <Tooltip texto={t('sinCuentaAyuda')}>
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">{t('sinCuenta')}</span>
                    </Tooltip>
                  )}
                </span>
                <span className="block truncate text-xs text-gray-500">{m.email}</span>
              </span>
              <FormConfirmar action={quitarMiembroAccion} mensaje={m.email === u.email ? t('confirmarSalir') : t('confirmarQuitar', { nombre: m.nombre })}>
                <input type="hidden" name="equipoId" value={equipoId} />
                <input type="hidden" name="email" value={m.email} />
                <Tooltip texto={m.email === u.email ? t('salirEquipo') : t('quitar')}>
                  <button className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                </Tooltip>
              </FormConfirmar>
            </li>
          ))}
        </ul>
        <form action={agregarMiembroAccion} className="mt-3 flex flex-col gap-1.5">
          <input type="hidden" name="equipoId" value={equipoId} />
          <div className="flex gap-2">
            <input name="email" required className="campo" placeholder={t('correoPlaceholder')} autoComplete="off" />
            <button className="boton shrink-0"><UserPlus size={14} /> {t('invitar')}</button>
          </div>
          <p className="text-xs text-gray-500">{t('invitarAyuda')}</p>
        </form>
      </section>

      <section className="tarjeta p-5">
        <h2 className="mb-1 font-semibold text-gray-800">{t('etapas')}</h2>
        <p className="mb-3 text-xs text-gray-500">{t.rich('etapasAyuda', { b: (c) => <b>{c}</b> })}</p>
        <ul className="flex flex-col gap-2">
          {etapas.map((et, i) => {
            const n = enUso(et.id);
            return (
              <li key={et.id} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
                <form action={renombrarEtapaAccion} className="flex min-w-0 flex-1 gap-1.5">
                  <input type="hidden" name="equipoId" value={equipoId} />
                  <input type="hidden" name="etapaId" value={et.id} />
                  <input name="nombre" defaultValue={et.nombre} className="campo py-1" />
                  <Tooltip texto={t('guardarNombre')}><button className="boton-suave py-1"><Check size={14} /></button></Tooltip>
                </form>
                <Tooltip texto={t('pendientesEn')}><span className="w-8 text-center text-[11px] text-gray-400">{n}</span></Tooltip>
                <form action={moverEtapaAccion}><input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} /><input type="hidden" name="direccion" value="-1" />
                  <Tooltip texto={t('subir')}><button disabled={i === 0} className={botonIcono}><ArrowUp size={14} /></button></Tooltip></form>
                <form action={moverEtapaAccion}><input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} /><input type="hidden" name="direccion" value="1" />
                  <Tooltip texto={t('bajar')}><button disabled={i === etapas.length - 1} className={botonIcono}><ArrowDown size={14} /></button></Tooltip></form>
                <form action={marcarEtapaFinalAccion}><input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} />
                  <Tooltip texto={t('esHecho')}><button className={`rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${et.esFinal ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:bg-gray-200'}`}>{et.esFinal ? t('hecho') : t('hechoPregunta')}</button></Tooltip></form>
                <FormConfirmar action={eliminarEtapaAccion} mensaje={t('confirmarEliminarEtapa', { nombre: et.nombre })}>
                  <input type="hidden" name="equipoId" value={equipoId} /><input type="hidden" name="etapaId" value={et.id} />
                  <Tooltip texto={n > 0 ? t('tienePendientes') : t('eliminar')}><button disabled={n > 0 || etapas.length <= 1} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={14} /></button></Tooltip>
                </FormConfirmar>
              </li>
            );
          })}
        </ul>
        <form action={agregarEtapaAccion} className="mt-3 flex gap-2">
          <input type="hidden" name="equipoId" value={equipoId} />
          <input name="nombre" required className="campo" placeholder={t('nuevaEtapa')} autoComplete="off" />
          <button className="boton-suave">{tc('agregar')}</button>
        </form>
      </section>
    </div>
  );
}
