import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { miembroActual } from '@/lib/auth';
import { adjuntosSueltos, comentariosDe, etapasDe, eventosDe, miembrosDe, tarea } from '@/lib/repositorio';
import { fechaCorta, haceCuanto } from '@/lib/fechas';
import type { Evento } from '@/lib/modelo';
import { Avatar } from '@/components/Avatar';
import { EditorTarea } from '@/components/EditorTarea';
import { FormularioComentario } from '@/components/FormularioComentario';
import { ImagenAdjunta } from '@/components/ImagenAdjunta';

export const dynamic = 'force-dynamic';

function describir(e: Evento, nombre: (email: string) => string): string {
  const d = e.detalle as Record<string, unknown>;
  const lista = (v: unknown) => (Array.isArray(v) && v.length ? v.map((x) => nombre(String(x))).join(', ') : 'nadie');
  switch (e.tipo) {
    case 'creada': return 'creó el pendiente';
    case 'titulo': return `cambió el título a «${d.a}»`;
    case 'descripcion': return 'editó la descripción';
    case 'etapa': return `lo movió de ${d.de} a ${d.a}`;
    case 'fecha': return d.a ? `puso la fecha límite en ${fechaCorta(String(d.a))}` : 'quitó la fecha límite';
    case 'prioridad': return d.a === 'alta' ? 'lo marcó como prioridad alta' : 'le quitó la prioridad alta';
    case 'asignados': return `asignó a ${lista(d.a)}`;
    case 'etiquetas': return Array.isArray(d.a) && d.a.length ? `etiquetó con ${d.a.map((x) => '#' + x).join(' ')}` : 'quitó las etiquetas';
    case 'comentario': return 'comentó';
    case 'adjunto': return `adjuntó ${d.nombre}`;
    default: return e.tipo;
  }
}

export default async function PaginaTarea({ params }: { params: Promise<{ equipoId: string; tareaId: string }> }) {
  const { equipoId, tareaId } = await params;
  await miembroActual(equipoId);
  const t = tarea(tareaId);
  if (!t || t.equipoId !== equipoId) notFound();
  const etapas = etapasDe(equipoId);
  const miembros = miembrosDe(equipoId);
  const nombre = (email: string) => miembros.find((m) => m.email === email)?.nombre ?? email;
  const comentarios = comentariosDe(tareaId);
  const sueltos = adjuntosSueltos(tareaId);
  const eventos = eventosDe(tareaId);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        <Link href={`/e/${equipoId}`} className="flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> Volver al tablero</Link>

        <section className="tarjeta p-5">
          <EditorTarea tarea={t} etapas={etapas} miembros={miembros} />
        </section>

        {sueltos.length > 0 && (
          <section className="tarjeta p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Imágenes</h2>
            <div className="flex flex-wrap gap-3">{sueltos.map((a) => <ImagenAdjunta key={a.id} adjunto={a} />)}</div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Seguimiento <span className="font-normal normal-case tracking-normal">· {comentarios.length} {comentarios.length === 1 ? 'comentario' : 'comentarios'}</span></h2>
          {comentarios.map((c) => (
            <article key={c.id} className="tarjeta flex gap-3 p-4">
              <Avatar nombre={nombre(c.autor)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{nombre(c.autor)}</span> · {haceCuanto(c.creadoEn)}</p>
                {c.texto && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{c.texto}</p>}
                {c.adjuntos.length > 0 && <div className="mt-2 flex flex-wrap gap-3">{c.adjuntos.map((a) => <ImagenAdjunta key={a.id} adjunto={a} />)}</div>}
              </div>
            </article>
          ))}
          <FormularioComentario tareaId={tareaId} />
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <section className="tarjeta p-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Ficha</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-600">
            <dt className="text-gray-400">Creado por</dt><dd>{nombre(t.creadoPor)}</dd>
            <dt className="text-gray-400">Creado</dt><dd>{fechaCorta(new Date(t.creadoEn).toISOString().slice(0, 10))}</dd>
            <dt className="text-gray-400">Actualizado</dt><dd>{haceCuanto(t.actualizadoEn)}</dd>
            {t.terminadoEn && <><dt className="text-gray-400">Terminado</dt><dd>{haceCuanto(t.terminadoEn)}</dd></>}
          </dl>
        </section>
        <section className="tarjeta p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Historial</h2>
          <ol className="flex flex-col gap-2 text-xs text-gray-600">
            {eventos.map((e) => (
              <li key={e.id} className="flex gap-2">
                <Avatar nombre={nombre(e.autor)} tam="sm" />
                <span><span className="font-semibold text-gray-700">{nombre(e.autor).split(' ')[0]}</span> {describir(e, nombre)} <span className="text-gray-400">· {haceCuanto(e.creadoEn)}</span></span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
