'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Sparkles } from 'lucide-react';
import { interpretar, type MiembroParaParse } from '@/lib/parseRapido';
import { fechaCorta } from '@/lib/fechas';
import { crearTareaRapida } from '@/lib/acciones';

/**
 * La línea rápida. Mientras escribes, abajo se ve cómo se va a leer:
 * título, responsable, fecha, etiquetas. Enter crea el pendiente.
 */
export function BarraRapida({ equipoId, miembros }: { equipoId: string; miembros: MiembroParaParse[] }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creadas, setCreadas] = useState(0);
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);

  const lectura = useMemo(() => (texto.trim() ? interpretar(texto, miembros) : null), [texto, miembros]);
  const nombreDe = (email: string) => miembros.find((m) => m.email === email)?.nombre ?? email;

  const enviar = () => {
    if (!texto.trim() || pendiente) return;
    setError(null);
    iniciar(async () => {
      const r = await crearTareaRapida(equipoId, texto);
      if (r.ok) { setTexto(''); setCreadas((n) => n + 1); router.refresh(); campo.current?.focus(); }
      else setError(r.error ?? 'No se pudo crear.');
    });
  };

  const insertar = (s: string) => {
    setTexto((t) => (t.endsWith(' ') || t === '' ? t : t + ' ') + s + ' ');
    campo.current?.focus();
  };

  return (
    <section className="tarjeta p-3">
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex items-center gap-2">
        <Sparkles size={18} className="shrink-0 text-acento" />
        <input
          ref={campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } }}
          placeholder="@harold revisar /master/insights esta semana #insights"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
          autoComplete="off"
          autoFocus
        />
        <button type="submit" disabled={!texto.trim() || pendiente} className="boton">{pendiente ? 'Creando…' : 'Crear'}</button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {lectura ? (
          <>
            <span className="font-medium text-gray-700">Se creará:</span>
            <span className={`font-semibold ${lectura.titulo ? 'text-gray-800' : 'text-red-600'}`}>{lectura.titulo || 'sin título'}</span>
            {lectura.asignados.map((a) => <span key={a} className="rounded-md bg-gray-100 px-1.5 py-0.5">@{nombreDe(a)}</span>)}
            {lectura.fechaLimite && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-800">vence {fechaCorta(lectura.fechaLimite)}</span>}
            {lectura.etiquetas.map((e) => <span key={e} className="rounded-md bg-acento/10 px-1.5 py-0.5 text-acento">#{e}</span>)}
            {lectura.prioridad === 'alta' && <span className="flex items-center gap-1 text-red-600"><Flag size={11} className="fill-red-500" /> alta</span>}
            {lectura.noResueltos.map((n) => <span key={n} className="text-red-600">@{n} no es de este equipo</span>)}
          </>
        ) : (
          <>
            <span><b className="text-gray-600">@nombre</b> responsable</span>
            <span><b className="text-gray-600">#etiqueta</b></span>
            <span><b className="text-gray-600">!</b> prioridad alta</span>
            <span><b className="text-gray-600">hoy · mañana · esta semana · el lunes · 15 oct · en 3 días</b> fecha</span>
            {creadas > 0 && <span className="ml-auto text-emerald-700">{creadas === 1 ? 'Pendiente creado ✓' : `${creadas} pendientes creados ✓`}</span>}
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex flex-wrap gap-1">
        {miembros.map((m) => (
          <button key={m.email} type="button" onClick={() => insertar('@' + m.email.split('@')[0].split('.')[0])} className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-500 hover:border-acento hover:text-acento">
            @{m.nombre.split(' ')[0]}
          </button>
        ))}
      </div>
    </section>
  );
}
