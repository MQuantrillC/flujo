// GET ?formato=md|json|csv|xlsx → descarga con todos los pendientes del equipo.
// Sólo para miembros. Las fechas van en la zona horaria del navegador (cookie).

import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getTranslations } from 'next-intl/server';
import { correoActual } from '@/lib/auth';
import { comentariosDe, equipo, esMiembro, etapasDe, miembrosDe, tareasDe, usuario } from '@/lib/repositorio';
import { zonaActual } from '@/lib/hoy';
import { aCsv, aJson, aMarkdown, COLUMNAS_CSV, filasPlanas, instruccionesIA, nombreArchivo, valoresIA, type DatosExportacion, type Rotulos, type RotulosIA } from '@/lib/exportar';

export const runtime = 'nodejs';

const FORMATOS = {
  md: { ext: 'md', mime: 'text/markdown; charset=utf-8' },
  json: { ext: 'json', mime: 'application/json; charset=utf-8' },
  csv: { ext: 'csv', mime: 'text/csv; charset=utf-8' },
  xlsx: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
} as const;
type Formato = keyof typeof FORMATOS;

async function excel(d: DatosExportacion, r: Rotulos, rotuloColumna: (c: string) => string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Flujo';
  const ws = wb.addWorksheet(d.equipo.nombre.slice(0, 31) || 'Flujo', { views: [{ state: 'frozen', ySplit: 1 }] });
  const anchos: Record<string, number> = { titulo: 48, etapa: 14, responsables: 24, fecha_limite: 12, prioridad: 10, etiquetas: 20, descripcion: 60, enlaces: 40, creado_por: 20, creado_en: 17, terminado_en: 17, comentarios: 60, id: 38 };
  ws.columns = COLUMNAS_CSV.map((c) => ({ header: rotuloColumna(c), key: c, width: anchos[c] ?? 16 }));
  ws.getRow(1).font = { bold: true };
  for (const f of filasPlanas(d, r)) ws.addRow(f);
  ws.eachRow((fila) => { fila.alignment = { vertical: 'top', wrapText: true }; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function GET(req: Request, { params }: { params: Promise<{ equipoId: string }> }) {
  const email = await correoActual();
  if (!email) return NextResponse.json({ error: 'sinSesion' }, { status: 401 });
  const { equipoId } = await params;
  if (!esMiembro(equipoId, email)) return NextResponse.json({ error: 'noEncontrado' }, { status: 404 });
  const formato = new URL(req.url).searchParams.get('formato') as Formato | null;
  if (!formato || !(formato in FORMATOS)) return NextResponse.json({ error: 'formato' }, { status: 400 });

  const t = await getTranslations('exportar');
  const tareas = tareasDe(equipoId);
  const d: DatosExportacion = {
    equipo: equipo(equipoId)!, etapas: etapasDe(equipoId), miembros: miembrosDe(equipoId), tareas,
    comentarios: Object.fromEntries(tareas.filter((x) => x.comentarios > 0).map((x) => [x.id, comentariosDe(x.id)])),
    zona: await zonaActual(), ahora: new Date(),
  };
  const r: Rotulos = {
    titulo: t('rotulos.titulo', { equipo: d.equipo.nombre }), exportado: t('rotulos.exportado'), etapas: t('rotulos.etapas'), miembros: t('rotulos.miembros'), hecho: t('rotulos.hecho'),
    sinResponsable: t('rotulos.sinResponsable'), responsables: t('rotulos.responsables'), correos: t('rotulos.correos'), vence: t('rotulos.vence'),
    prioridad: t('rotulos.prioridad'), alta: t('rotulos.alta'), normal: t('rotulos.normal'), etiquetas: t('rotulos.etiquetas'), descripcion: t('rotulos.descripcion'),
    enlaces: t('rotulos.enlaces'), creadoPor: t('rotulos.creadoPor'), creadoEn: t('rotulos.creadoEn'), terminadoEn: t('rotulos.terminadoEn'),
    comentarios: t('rotulos.comentarios'), estado: t('rotulos.estado'), abierto: t('rotulos.abierto'), id: t('rotulos.id'),
  };

  const yo = usuario(email) ?? { nombre: email, email };
  // next-intl exige los valores de los huecos al traducir; son los mismos que usa instruccionesIA.
  const v = valoresIA(d, yo);
  const ia: RotulosIA = {
    titulo: t('ia.titulo'), contexto: t('ia.contexto', v), contextoPersonal: t('ia.contextoPersonal', v), pide: t('ia.pide'),
    puntos: [1, 2, 3, 4, 5].map((i) => t(`ia.punto${i}`, v)), etapas: t('ia.etapas', v), cierre: t('ia.cierre'),
  };
  const cuerpo: string | Buffer =
    formato === 'md' ? aMarkdown(d, r, instruccionesIA(d, ia, yo))
    : formato === 'json' ? aJson(d)
    : formato === 'csv' ? aCsv(d, r)
    : await excel(d, r, (c) => t(`columnas.${c}`));

  const nombre = `${nombreArchivo(d.equipo.nombre, d.ahora, d.zona)}.${FORMATOS[formato].ext}`;
  return new NextResponse(cuerpo as BodyInit, {
    headers: {
      'Content-Type': FORMATOS[formato].mime,
      'Content-Disposition': `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'Cache-Control': 'no-store',
    },
  });
}
