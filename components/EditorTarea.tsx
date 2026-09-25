'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Flag, Trash2 } from 'lucide-react';
import { actualizarTareaAccion, eliminarTareaAccion, type ResultadoGuardar } from '@/lib/acciones';
import type { Etapa, Tarea, Usuario } from '@/lib/modelo';
import { CampoEtiquetas } from './CampoEtiquetas';
import { Filas } from './Filas';
import { FormConfirmar } from './FormConfirmar';
import { SelectorEtapa } from './SelectorEtapa';
import { SelectorFecha } from './SelectorFecha';
import { Tooltip } from './Tooltip';

type Estado = ResultadoGuardar & { en?: number };

/** Todo lo editable de un pendiente en un solo formulario. Guarda con el botón o con Ctrl+Enter. */
export function EditorTarea({ tarea, etapas, miembros, etiquetasEquipo = [] }: {
  tarea: Tarea; etapas: Etapa[]; miembros: Usuario[];
  /** Las etiquetas que ya usa el equipo, para sugerirlas. */
  etiquetasEquipo?: string[];
}) {
  const t = useTranslations('tarea');
  const te = useTranslations('errores');
  // `en` cambia con cada guardado: el aviso «Guardado ✓» se vuelve a pintar (y a desvanecer) cada vez.
  const [estado, enviar, pendiente] = useActionState<Estado, FormData>(async (_prev, fd) => ({ ...(await actualizarTareaAccion(fd)), en: Date.now() }), { ok: true });
  const [prioridad, setPrioridad] = useState(tarea.prioridad);

  // El botón de borrar es otro formulario: no puede ir dentro del de edición.
  return (
    <div className="flex flex-col gap-3">
    <form
      action={enviar}
      className="flex flex-col gap-4"
      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') (e.currentTarget as HTMLFormElement).requestSubmit(); }}
    >
      <input type="hidden" name="tareaId" value={tarea.id} />
      <input type="hidden" name="prioridad" value={prioridad} />

      <div className="flex items-start gap-2">
        <Tooltip texto={prioridad === 'alta' ? t('quitarAlta') : t('marcarAlta')} className="mt-2">
          <button type="button" onClick={() => setPrioridad((p) => (p === 'alta' ? 'normal' : 'alta'))} aria-pressed={prioridad === 'alta'}
            className={`rounded-md p-1 transition-colors ${prioridad === 'alta' ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'}`}>
            <Flag size={18} className={prioridad === 'alta' ? 'fill-red-500' : ''} />
          </button>
        </Tooltip>
        <input name="titulo" defaultValue={tarea.titulo} required className="campo text-lg font-semibold" />
      </div>

      <textarea name="descripcion" defaultValue={tarea.descripcion} rows={4} className="campo" placeholder={t('descripcion')} />

      <div className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">{t('enlaces')} <span className="font-normal normal-case tracking-normal">· {t('enlacesAyuda')}</span></span>
        <Filas
          columnas={[
            { name: 'enlaceUrl', placeholder: t('enlacesPlaceholder'), className: 'flex-[3] font-mono text-xs' },
            { name: 'enlaceNombre', placeholder: t('enlaceNombre'), className: 'flex-[2]' },
          ]}
          inicial={tarea.enlaces.map((e) => [e.url, e.nombre])}
          agregar={t('agregarEnlace')}
          quitar={t('quitarEnlace')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">{t('etapa')}</span>
          <SelectorEtapa name="etapaId" etapaId={tarea.etapaId} etapas={etapas} tam="md" />
        </div>
        <div className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">{t('fechaLimite')}</span>
          <SelectorFecha name="fechaLimite" valor={tarea.fechaLimite} />
        </div>
        <fieldset className="text-sm">
          <legend className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">{t('responsables')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {miembros.map((m) => (
              <label key={m.email} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm has-checked:border-acento has-checked:bg-acento/10 has-checked:text-acento">
                <input type="checkbox" name="asignados" value={m.email} defaultChecked={tarea.asignados.includes(m.email)} className="accent-acento" />
                {m.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">{t('etiquetas')}</span>
          <CampoEtiquetas name="etiquetas" inicial={tarea.etiquetas} existentes={etiquetasEquipo} placeholder={t('etiquetasEjemplo')} />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="boton"><Check size={14} /> {pendiente ? t('guardando') : t('guardar')}</button>
        {estado.en && estado.ok && !pendiente && <span key={estado.en} className="desvanecer text-sm text-emerald-700">{t('guardado')}</span>}
        {!estado.ok && estado.error && <span className="text-sm text-red-600">{te(estado.error)}</span>}
      </div>
    </form>
    <FormConfirmar action={eliminarTareaAccion} peligro mensaje={t('confirmarBorrar')} className="self-end">
      <input type="hidden" name="tareaId" value={tarea.id} />
      <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600"><Trash2 size={13} /> {t('borrar')}</button>
    </FormConfirmar>
    </div>
  );
}
