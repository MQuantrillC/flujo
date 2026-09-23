// POST multipart con un .xlsx: devuelve su primera hoja como texto CSV, para que
// el importador lo trate igual que un CSV pegado. (Los .csv y .txt los lee el
// navegador directo; sólo el Excel necesita pasar por aquí.)

import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { correoActual } from '@/lib/auth';
import { esMiembro } from '@/lib/repositorio';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

function celdaATexto(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v) return String(v.text);
    if ('result' in v) return celdaATexto(v.result as ExcelJS.CellValue);
    if ('error' in v) return '';
  }
  return String(v);
}

const escapar = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export async function POST(req: Request, { params }: { params: Promise<{ equipoId: string }> }) {
  const email = await correoActual();
  if (!email) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  const { equipoId } = await params;
  if (!esMiembro(equipoId, email)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const fd = await req.formData();
  const archivo = fd.get('archivo');
  if (!(archivo instanceof File) || archivo.size === 0) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo pesa más de 5 MB.' }, { status: 400 });

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await archivo.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: 'El Excel no tiene hojas.' }, { status: 400 });
    const lineas: string[] = [];
    ws.eachRow((fila) => {
      const celdas: string[] = [];
      for (let c = 1; c <= fila.cellCount; c++) celdas.push(escapar(celdaATexto(fila.getCell(c).value).trim()));
      if (celdas.some(Boolean)) lineas.push(celdas.join(','));
    });
    return NextResponse.json({ texto: lineas.join('\n'), hoja: ws.name, filas: Math.max(0, lineas.length - 1) });
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el Excel.' }, { status: 400 });
  }
}
