// GET: el archivo, sólo para miembros del equipo dueño del pendiente. Las
// imágenes se ven en el navegador; lo demás se descarga.

import fs from 'fs';
import { correoActual } from '@/lib/auth';
import { esImagen } from '@/lib/adjuntos';
import { adjuntoConRuta, esMiembro } from '@/lib/repositorio';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await correoActual();
  if (!email) return new Response('Sin sesión', { status: 401 });
  const { id } = await params;
  const a = adjuntoConRuta(id);
  if (!a || !esMiembro(a.equipoId, email) || !fs.existsSync(a.rutaCompleta)) return new Response('No encontrado', { status: 404 });
  const cuerpo = fs.readFileSync(a.rutaCompleta);
  const nombre = encodeURIComponent(a.nombre);
  return new Response(cuerpo as unknown as BodyInit, {
    headers: {
      'Content-Type': a.mime,
      'Content-Length': String(cuerpo.length),
      'Content-Disposition': `${esImagen(a.mime) || a.mime === 'application/pdf' ? 'inline' : 'attachment'}; filename*=UTF-8''${nombre}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
