import { Check, Download, Trash2, UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { correoConfigurado } from '@/lib/correo';
import { equipo, equiposDe, etapasDe, miembrosDe, puedeEliminarEquipo, tareasDe, usuario } from '@/lib/repositorio';
import { agregarMiembroAccion, quitarMiembroAccion, renombrarEquipoAccion } from '@/lib/acciones';
import { Avatar } from '@/components/Avatar';
import { CopiarInvitacion } from '@/components/CopiarInvitacion';
import { CopiarParaIA } from '@/components/CopiarParaIA';
import { EditorEtapas } from '@/components/EditorEtapas';
import { EliminarEquipo } from '@/components/EliminarEquipo';
import { FormConfirmar } from '@/components/FormConfirmar';
import { PasarPendientes } from '@/components/PasarPendientes';
import { Tooltip } from '@/components/Tooltip';

export const dynamic = 'force-dynamic';

/** Ajustes del equipo: su nombre, quiénes están y las etapas del tablero. */
export default async function Ajustes({ params }: { params: Promise<{ equipoId: string }> }) {
  const { equipoId } = await params;
  const u = await miembroActual(equipoId);
  const t = await getTranslations('miembros');
  const tc = await getTranslations('comun');
  const tx = await getTranslations('exportar');
  const tp = await getTranslations('pasar');
  const e = equipo(equipoId)!;
  const miembros = miembrosDe(equipoId);
  const etapas = etapasDe(equipoId);
  const tareas = tareasDe(equipoId);
  const puedeEliminar = puedeEliminarEquipo(equipoId, u.email);
  const enUso: Record<string, number> = {};
  for (const x of tareas) enUso[x.etapaId] = (enUso[x.etapaId] ?? 0) + 1;

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
              {m.email !== u.email && <CopiarInvitacion invitado={{ email: m.email, equipoId, equipoNombre: e.nombre, tieneCuenta: m.tieneCuenta }} />}
              <FormConfirmar action={quitarMiembroAccion} peligro boton={m.email === u.email ? t('salirEquipo') : t('quitar')} mensaje={m.email === u.email ? t('confirmarSalir') : t('confirmarQuitar', { nombre: m.nombre })}>
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
          <p className="text-xs text-gray-500">{t('invitarAyuda')} {correoConfigurado() ? t('invitarCorreo') : t('invitarSinCorreo')}</p>
        </form>
      </section>

      <div className="flex flex-col gap-5">
        <section className="tarjeta p-5">
          <h2 className="mb-1 font-semibold text-gray-800">{t('etapas')}</h2>
          <p className="mb-3 text-xs text-gray-500">{t.rich('etapasAyuda', { b: (c) => <b>{c}</b> })} {t('etapasOrden')}</p>
          <EditorEtapas equipoId={equipoId} etapas={etapas} enUso={enUso} />
        </section>

        <section className="tarjeta p-5">
          <h2 className="mb-1 font-semibold text-gray-800">{tx('titulo')}</h2>
          <p className="mb-3 text-xs text-gray-500">{tx('ayuda')}</p>
          <div className="mb-3"><CopiarParaIA equipoId={equipoId} /></div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(['md', 'json', 'csv', 'xlsx'] as const).map((f) => (
              <li key={f}>
                <a href={`/api/equipos/${equipoId}/exportar?formato=${f}`} download className="flex h-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 transition-colors hover:border-acento hover:bg-acento/5">
                  <Download size={15} className="shrink-0 text-acento" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800">{tx(f)}</span>
                    <span className="block text-xs leading-snug text-gray-500">{tx(`${f}Ayuda`)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta p-5">
          <h2 className="mb-1 font-semibold text-gray-800">{tp('titulo')}</h2>
          <p className="mb-4 text-xs text-gray-500">{tp('ayuda')}</p>
          <PasarPendientes
            equipoId={equipoId}
            destinos={equiposDe(u.email).filter((x) => x.id !== equipoId).map((x) => ({ id: x.id, nombre: x.nombre }))}
            tareas={tareas.map((x) => ({ id: x.id, etapaId: x.etapaId, asignados: x.asignados, etiquetas: x.etiquetas }))}
            finales={etapas.filter((x) => x.esFinal).map((x) => x.id)}
            etiquetas={[...new Set(tareas.flatMap((x) => x.etiquetas))].sort()}
            yo={u.email}
          />
        </section>

        <section className="tarjeta border-red-200 p-5">
          <h2 className="mb-1 font-semibold text-red-700">{t('eliminarEquipo')}</h2>
          <p className="mb-3 text-xs text-gray-500">{t('eliminarAyuda')}</p>
          {puedeEliminar ? <EliminarEquipo equipoId={equipoId} nombre={e.nombre} /> : <p className="text-xs text-gray-500">{t('soloCreador', { nombre: usuario(e.creadoPor)?.nombre ?? e.creadoPor })}</p>}
        </section>
      </div>
    </div>
  );
}
