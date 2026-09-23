// GET: la imagen, sólo para miembros del equipo dueño del pendiente.

import fs from 'fs';
import { correoActual } from '@/lib/auth';
import { adjuntoConRuta, esMiembro } from '@/lib/repositorio';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await correoActual();
  if (!email) return new Response('Sin sesión', { status: 401 });
  const { id } = await params;
  const a = adjuntoConRuta(id);
  if (!a || !esMiembro(a.equipoId, email) || !fs.existsSync(a.rutaCompleta)) return new Response('No encontrado', { status: 404 });
  const cuerpo = fs.readFileSync(a.rutaCompleta);
  return new Response(cuerpo as unknown as BodyInit, {
    headers: {
      'Content-Type': a.mime,
      'Content-Length': String(cuerpo.length),
      'Content-Disposition': `inline; filename="${encodeURIComponent(a.nombre)}"`,
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
