// ──────────────────────────────────────────────────────────────────────────────
// NOTIFICAR — después de que alguien crea, edita, mueve, marca o comenta un
// pendiente, lee del historial lo que esa persona acaba de hacer y escribe a
// los responsables (reglas en lib/avisos.ts).
//
// Se prepara todo dentro de la petición (traducciones, dirección pública, hoy
// de quien escribe) y el envío va en after(): la pantalla no espera a Resend.
// Nunca rompe la acción que lo llama.
// ──────────────────────────────────────────────────────────────────────────────

import { after } from 'next/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { correoAviso, destinatarios, type MotivoAviso } from './avisos';
import { correoConfigurado, enviarCorreo } from './correo';
import { fechaCorta } from './fechas';
import { hoyActual } from './hoy';
import { idiomaValido } from './idioma';
import type { Evento } from './modelo';
import * as repo from './repositorio';
import { urlBase } from './url';

/** Adjuntos subidos justo después de crear el pendiente (la línea rápida con archivos): ya van en el aviso de «te asignó». */
const GRACIA_ADJUNTOS_MS = 2 * 60_000;

/** `desde`: el momento (ms) antes de tocar el pendiente; cuenta lo que `autor` hizo desde entonces. */
export async function avisarResponsables(tareaId: string, autor: string, desde: number): Promise<void> {
  if (!correoConfigurado()) return;
  try {
    const t = repo.tarea(tareaId);
    if (!t) return;
    const eventos = repo.eventosDesde(tareaId, autor, desde);
    if (eventos.length && eventos.every((e) => e.tipo === 'adjunto') && t.creadoPor === autor && Date.now() - t.creadoEn < GRACIA_ADJUNTOS_MS) return;
    const miembros = repo.miembrosDe(t.equipoId);
    const dest = destinatarios(eventos, {
      asignados: t.asignados, autor, silenciados: repo.silenciadosDe(t.equipoId),
      conCuenta: new Set(miembros.filter((m) => m.tieneCuenta).map((m) => m.email)),
    });
    if (dest.length === 0) return;

    const e = repo.equipo(t.equipoId);
    if (!e) return;
    const base = await urlBase();
    const idioma = idiomaValido(await getLocale());
    const hoy = await hoyActual();
    const tr = await getTranslations('correo.aviso');
    const ti = await getTranslations('correo.invitacion');
    const nombre = (email: string) => miembros.find((m) => m.email === email)?.nombre ?? repo.usuario(email)?.nombre ?? email;
    const fecha = (iso: unknown) => (typeof iso === 'string' && iso ? fechaCorta(iso, hoy, idioma) : tr('sinFecha'));
    const quien = nombre(autor);

    const cambios = eventos.map((ev) => ({ tipo: ev.tipo, texto: linea(ev, tr, fecha, nombre) })).filter((c): c is { tipo: Evento['tipo']; texto: string } => !!c.texto);
    const etapa = repo.etapa(t.etapaId);
    const meta = [etapa?.nombre, t.fechaLimite ? tr('vence', { fecha: fecha(t.fechaLimite) }) : null, t.prioridad === 'alta' ? tr('alta') : null].filter((m): m is string => !!m);
    const evComentario = [...eventos].reverse().find((ev) => ev.tipo === 'comentario');
    const comentario = evComentario ? repo.comentariosDe(tareaId).find((c) => c.id === evComentario.detalle.comentarioId) : undefined;

    const enlace = `${base}/e/${t.equipoId}/t/${t.id}`;
    const ajustes = `${base}/e/${t.equipoId}/ajustes`;
    const icono = `${base}/apple-icon.png`;
    const textos: Record<MotivoAviso, { asunto: string; titulo: string }> = {
      asignado: { asunto: tr('asuntoAsignado', { quien, titulo: t.titulo }), titulo: tr('tituloAsignado', { quien }) },
      comentario: { asunto: tr('asuntoComentario', { quien, titulo: t.titulo }), titulo: tr('tituloComentario', { quien }) },
      cambio: { asunto: tr('asuntoCambio', { quien, titulo: t.titulo }), titulo: tr('tituloCambio', { quien }) },
    };
    const envios = dest.map((d) => ({
      para: d.email,
      correo: correoAviso({
        ...textos[d.motivo], equipo: tr('enEquipo', { equipo: e.nombre }), pendiente: t.titulo, meta,
        // A quien acaban de asignar no le cuento cómo quedaron los responsables: ya lo dice el título.
        lineas: cambios.filter((c) => d.motivo !== 'asignado' || c.tipo !== 'asignados').map((c) => c.texto),
        comentario: comentario ? { rotulo: tr('escribio', { quien }), texto: comentario.texto } : null,
        boton: tr('boton'), oEnlace: ti('oEnlace'), pie: tr('pie'), apagar: tr('apagar'), firma: ti('firma'),
      }, enlace, ajustes, icono),
    }));
    after(async () => { await Promise.allSettled(envios.map((x) => enviarCorreo(x.para, x.correo))); });
  } catch (err) {
    console.error('[avisos] no se pudo preparar el aviso:', err instanceof Error ? err.message : err);
  }
}

type T = (clave: string, valores?: Record<string, string | number>) => string;

/** Una línea legible por evento; «creada» y «comentario» no llevan (el título y la cita ya lo dicen). */
function linea(ev: Evento, tr: T, fecha: (iso: unknown) => string, nombre: (email: string) => string): string | null {
  const d = ev.detalle;
  const lista = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  switch (ev.tipo) {
    case 'titulo': return tr('lTitulo', { a: String(d.a ?? '') });
    case 'descripcion': return tr('lDescripcion');
    case 'fecha': return tr('lFecha', { de: fecha(d.de), a: fecha(d.a) });
    case 'prioridad': return d.a === 'alta' ? tr('lAlta') : tr('lNormal');
    case 'etapa': return tr('lEtapa', { de: String(d.de ?? ''), a: String(d.a ?? '') });
    case 'asignados': { const a = lista(d.a); return tr('lAsignados', { nombres: a.length ? a.map(nombre).join(', ') : tr('nadie') }); }
    case 'etiquetas': { const a = lista(d.a); return tr('lEtiquetas', { lista: a.length ? a.map((x) => `#${x}`).join(' ') : tr('ninguna') }); }
    case 'enlaces': return tr('lEnlaces');
    case 'adjunto': return tr('lAdjunto', { nombre: String(d.nombre ?? '') });
    default: return null;
  }
}
