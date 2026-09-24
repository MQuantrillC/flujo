// POST multipart: texto (opcional) + archivos (opcional): imágenes, PDF, Office,
// CSV, texto o zip. Con texto se crea un comentario y los archivos cuelgan de
// él; sin texto, cuelgan directo del pendiente.

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { correoActual } from '@/lib/auth';
import { extensionPermitida, MAX_MB_ADJUNTO, mimeDe } from '@/lib/adjuntos';
import { comentar, esMiembro, guardarAdjunto, tarea } from '@/lib/repositorio';

export const runtime = 'nodejs';

const MAX_BYTES = MAX_MB_ADJUNTO * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ tareaId: string }> }) {
  const email = await correoActual();
  if (!email) return NextResponse.json({ error: 'sinSesion' }, { status: 401 });
  const { tareaId } = await params;
  const t = tarea(tareaId);
  if (!t || !esMiembro(t.equipoId, email)) return NextResponse.json({ error: 'noEncontrado' }, { status: 404 });

  const fd = await req.formData();
  const texto = String(fd.get('texto') ?? '').trim();
  const archivos = fd.getAll('archivos').filter((a): a is File => a instanceof File && a.size > 0);
  if (!texto && archivos.length === 0) return NextResponse.json({ error: 'vacio' }, { status: 400 });
  for (const a of archivos) {
    if (!extensionPermitida(a.name)) return NextResponse.json({ error: 'tipoNoPermitido', nombre: a.name }, { status: 400 });
    if (a.size > MAX_BYTES) return NextResponse.json({ error: 'muyGrande', nombre: a.name, mb: MAX_MB_ADJUNTO }, { status: 400 });
  }

  const comentario = texto ? comentar(tareaId, email, texto) : null;
  for (const a of archivos) {
    guardarAdjunto({ tareaId, comentarioId: comentario?.id ?? null, nombre: a.name || 'archivo', mime: mimeDe(a.name, a.type), contenido: Buffer.from(await a.arrayBuffer()), subidoPor: email });
  }
  revalidatePath(`/e/${t.equipoId}`, 'layout');
  return NextResponse.json({ ok: true, comentarioId: comentario?.id ?? null, adjuntos: archivos.length });
}
