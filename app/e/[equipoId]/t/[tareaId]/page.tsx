import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Copy, Link2, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { miembroActual } from '@/lib/auth';
import { adjuntosSueltos, comentariosDe, equipo, equiposDe, esMiembro, etapasDe, eventosDe, miembrosDe, tarea, tareasDe, vinculadasDe } from '@/lib/repositorio';
import { etiquetasEnUso } from '@/lib/vistas';
import { pasarTareaAccion } from '@/lib/acciones';
import { aIso, fechaCorta, haceCuanto } from '@/lib/fechas';
import { hoyActual } from '@/lib/hoy';
import { etiquetaEnlace, extraerEnlaces } from '@/lib/enlaces';
import { idiomaValido, type Idioma } from '@/lib/idioma';
import { nombresCortos } from '@/lib/nombres';
import type { Evento } from '@/lib/modelo';
import { Avatar } from '@/components/Avatar';
import { EditorTarea } from '@/components/EditorTarea';
import { FormularioComentario } from '@/components/FormularioComentario';
import { AdjuntoVista } from '@/components/AdjuntoVista';
import { FormConfirmar } from '@/components/FormConfirmar';
import { SubirAdjuntos } from '@/components/SubirAdjuntos';
import { Tooltip } from '@/components/Tooltip';
import { TextoConEnlaces } from '@/components/TextoConEnlaces';

export const dynamic = 'force-dynamic';

type T = (clave: string, valores?: Record<string, string | number>) => string;

function describir(e: Evento, nombre: (email: string) => string, th: T, idioma: Idioma, hoy: Date): string {
  const d = e.detalle as Record<string, unknown>;
  const lista = (v: unknown) => (Array.isArray(v) && v.length ? v.map((x) => nombre(String(x))).join(', ') : th('nadie'));
  switch (e.tipo) {
    case 'creada': return th('creada');
    case 'titulo': return th('titulo', { a: String(d.a ?? '') });
    case 'descripcion': return th('descripcion');
    case 'etapa': return th('etapa', { de: String(d.de ?? ''), a: String(d.a ?? '') });
    case 'fecha': return d.a ? th('fecha', { a: fechaCorta(String(d.a), hoy, idioma) }) : th('sinFecha');
    case 'prioridad': return d.a === 'alta' ? th('prioridadAlta') : th('prioridadNormal');
    case 'asignados': return th('asignados', { a: lista(d.a) });
    case 'etiquetas': return Array.isArray(d.a) && d.a.length ? th('etiquetas', { a: d.a.map((x) => '#' + x).join(' ') }) : th('sinEtiquetas');
    case 'enlaces': return th('enlaces', { n: Array.isArray(d.a) ? d.a.length : 0 });
    case 'comentario': return th('comentario');
    case 'adjunto': return th('adjunto', { nombre: String(d.nombre ?? '') });
    default: return e.tipo;
  }
}

export default async function PaginaTarea({ params }: { params: Promise<{ equipoId: string; tareaId: string }> }) {
  const { equipoId, tareaId } = await params;
  const u = await miembroActual(equipoId);
  const x = tarea(tareaId);
  if (!x || x.equipoId !== equipoId) notFound();
  const equipoActual = equipo(equipoId)!;
  const vinculadas = vinculadasDe(tareaId);
  // Mis otros equipos donde este pendiente todavía no tiene gemelo.
  const otrosEquipos = equiposDe(u.email).filter((e) => e.id !== equipoId && !vinculadas.some((v) => v.equipo.id === e.id));
  const t = await getTranslations('tarea');
  const th = await getTranslations('historial');
  const tc = await getTranslations('comun');
  const idioma = idiomaValido(await getLocale());
  const hoy = await hoyActual();
  const etapas = etapasDe(equipoId);
  const miembros = miembrosDe(equipoId);
  const nombre = (email: string) => miembros.find((m) => m.email === email)?.nombre ?? email;
  const cortos = nombresCortos(miembros);
  const corto = (email: string) => cortos[email] ?? nombre(email).split(' ')[0];
  const comentarios = comentariosDe(tareaId);
  const sueltos = adjuntosSueltos(tareaId);
  const eventos = eventosDe(tareaId);
  const hace = (ms: number) => haceCuanto(ms, undefined, idioma);
  // Los enlaces propios más los que aparezcan en la descripción, sin repetir.
  const enlaces = [...x.enlaces, ...extraerEnlaces(x.descripcion).filter((u) => !x.enlaces.some((e) => e.url === u)).map((url) => ({ url, nombre: '' }))];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        <Link href={`/e/${equipoId}`} className="flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} /> {tc('volverTablero')}</Link>

        <section className="tarjeta p-5">
          <EditorTarea tarea={x} etapas={etapas} miembros={miembros} etiquetasEquipo={etiquetasEnUso(tareasDe(equipoId)).map((e) => e.etiqueta)} />
        </section>

        <section className="tarjeta p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{t('adjuntos')}{sueltos.length > 0 && <span className="ml-1.5 font-normal normal-case tracking-normal">· {sueltos.length}</span>}</h2>
          {sueltos.length > 0 && <div className="mb-3 flex flex-wrap gap-3">{sueltos.map((a) => <AdjuntoVista key={a.id} adjunto={a} grupo={sueltos} />)}</div>}
          <SubirAdjuntos tareaId={tareaId} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('seguimiento')} <span className="font-normal normal-case tracking-normal">· {t('comentarios', { n: comentarios.length })}</span></h2>
          {comentarios.map((c) => (
            <article key={c.id} className="tarjeta flex gap-3 p-4">
              <Avatar nombre={nombre(c.autor)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{nombre(c.autor)}</span> · {hace(c.creadoEn)}</p>
                {c.texto && <TextoConEnlaces texto={c.texto} className="mt-1 whitespace-pre-wrap text-sm text-gray-800" />}
                {c.adjuntos.length > 0 && <div className="mt-2 flex flex-wrap gap-3">{c.adjuntos.map((a) => <AdjuntoVista key={a.id} adjunto={a} grupo={c.adjuntos} />)}</div>}
              </div>
            </article>
          ))}
          <FormularioComentario tareaId={tareaId} />
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        {enlaces.length > 0 && (
          <section className="tarjeta p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{t('enlaces')}</h2>
            <ul className="flex flex-col gap-1.5">
              {enlaces.map((e) => (
                <li key={e.url}>
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-acento/10">
                    <Link2 size={14} className="mt-0.5 shrink-0 text-gray-400 group-hover:text-acento" />
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-800 group-hover:text-acento">{e.nombre || etiquetaEnlace(e.url)}</span>
                      <span className="block truncate text-[11px] text-gray-400">{e.url.replace(/^https?:\/\//, '')}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="tarjeta p-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{t('equipos')}</h2>
          <ul className="flex flex-col gap-1 text-xs">
            <li className="flex items-center gap-1.5 font-semibold text-gray-800"><Users size={12} className="text-acento" /> {equipoActual.nombre} <span className="font-normal text-gray-400">{t('esteEquipo')}</span></li>
            {vinculadas.map((v) => (
              <li key={v.tarea.id} className="flex items-center gap-1.5 text-gray-700">
                <Copy size={12} className="text-gray-400" />
                {esMiembro(v.equipo.id, u.email) ? <Link href={`/e/${v.equipo.id}/t/${v.tarea.id}`} className="font-medium hover:text-acento hover:underline">{v.equipo.nombre}</Link> : v.equipo.nombre}
                <span className="text-gray-400">· {etapasDe(v.equipo.id).find((e) => e.id === v.tarea.etapaId)?.nombre ?? ''}</span>
              </li>
            ))}
          </ul>
          {vinculadas.length > 0 && <p className="mt-2 text-[11px] leading-snug text-gray-400">{t('vinculadosAyuda')}</p>}
          {otrosEquipos.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3">
              {otrosEquipos.map((eq) => (
                <div key={eq.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="min-w-0 flex-1 truncate text-gray-600">{eq.nombre}</span>
                  <form action={pasarTareaAccion}>
                    <input type="hidden" name="tareaId" value={tareaId} /><input type="hidden" name="destino" value={eq.id} /><input type="hidden" name="modo" value="copiar" />
                    <Tooltip texto={t('copiarAyuda')}><button className="rounded-md border border-gray-200 px-2 py-0.5 font-medium text-gray-600 transition-colors hover:border-acento hover:text-acento">{t('copiarA')}</button></Tooltip>
                  </form>
                  <FormConfirmar action={pasarTareaAccion} boton={t('moverA')} mensaje={t('confirmarMover', { equipo: eq.nombre })}>
                    <input type="hidden" name="tareaId" value={tareaId} /><input type="hidden" name="destino" value={eq.id} /><input type="hidden" name="modo" value="mover" />
                    <Tooltip texto={t('moverAyuda')}><button className="rounded-md border border-gray-200 px-2 py-0.5 font-medium text-gray-600 transition-colors hover:border-acento hover:text-acento">{t('moverA')}</button></Tooltip>
                  </FormConfirmar>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="tarjeta p-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{t('ficha')}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-600">
            <dt className="text-gray-400">{t('creadoPor')}</dt><dd>{nombre(x.creadoPor)}</dd>
            <dt className="text-gray-400">{t('creado')}</dt><dd>{fechaCorta(aIso(new Date(x.creadoEn)), hoy, idioma)}</dd>
            <dt className="text-gray-400">{t('actualizado')}</dt><dd>{hace(x.actualizadoEn)}</dd>
            {x.terminadoEn && <><dt className="text-gray-400">{t('terminado')}</dt><dd>{hace(x.terminadoEn)}</dd></>}
          </dl>
        </section>
        <section className="tarjeta p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{t('historial')}</h2>
          <ol className="flex flex-col gap-2 text-xs text-gray-600">
            {eventos.map((e) => (
              <li key={e.id} className="flex gap-2">
                <Avatar nombre={nombre(e.autor)} tam="sm" />
                <span><span className="font-semibold text-gray-700">{corto(e.autor)}</span> {describir(e, nombre, th, idioma, hoy)} <span className="text-gray-400">· {hace(e.creadoEn)}</span></span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
