'use client';

import { useActionState, useState } from 'react';
import { Check, Flag, Trash2 } from 'lucide-react';
import { actualizarTareaAccion, eliminarTareaAccion, type ResultadoGuardar } from '@/lib/acciones';
import type { Etapa, Tarea, Usuario } from '@/lib/modelo';
import { FormConfirmar } from './FormConfirmar';

type Estado = ResultadoGuardar & { en?: number };

/** Todo lo editable de un pendiente en un solo formulario. Guarda con el botón o con Ctrl+Enter. */
export function EditorTarea({ tarea, etapas, miembros }: { tarea: Tarea; etapas: Etapa[]; miembros: Usuario[] }) {
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
        <button type="button" onClick={() => setPrioridad((p) => (p === 'alta' ? 'normal' : 'alta'))} title={prioridad === 'alta' ? 'Prioridad alta (quitar)' : 'Marcar prioridad alta'}
          className={`mt-2 rounded-md p-1 ${prioridad === 'alta' ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'}`}>
          <Flag size={18} className={prioridad === 'alta' ? 'fill-red-500' : ''} />
        </button>
        <input name="titulo" defaultValue={tarea.titulo} required className="campo text-lg font-semibold" />
      </div>

      <textarea name="descripcion" defaultValue={tarea.descripcion} rows={4} className="campo" placeholder="Descripción, contexto, enlaces…" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Etapa</span>
          <select name="etapaId" defaultValue={tarea.etapaId} className="campo">
            {etapas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Fecha límite</span>
          <input type="date" name="fechaLimite" defaultValue={tarea.fechaLimite ?? ''} className="campo" />
        </label>
        <fieldset className="text-sm">
          <legend className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Responsables</legend>
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
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Etiquetas</span>
          <input name="etiquetas" defaultValue={tarea.etiquetas.join(', ')} className="campo" placeholder="insights, q4" autoComplete="off" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="boton"><Check size={14} /> {pendiente ? 'Guardando…' : 'Guardar'}</button>
        {estado.en && estado.ok && !pendiente && <span key={estado.en} className="desvanecer text-sm text-emerald-700">Guardado ✓</span>}
        {!estado.ok && estado.error && <span className="text-sm text-red-600">{estado.error}</span>}
      </div>
    </form>
    <FormConfirmar action={eliminarTareaAccion} mensaje="¿Borrar este pendiente con sus comentarios e imágenes? No se puede deshacer." className="self-end">
      <input type="hidden" name="tareaId" value={tarea.id} />
      <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600"><Trash2 size={13} /> Borrar pendiente</button>
    </FormConfirmar>
    </div>
  );
}
