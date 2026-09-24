// ──────────────────────────────────────────────────────────────────────────────
// ADJUNTOS — qué archivos se pueden subir a un pendiente y cómo se muestran.
// Sin nada de Node: lo usan el navegador y el servidor por igual.
// ──────────────────────────────────────────────────────────────────────────────

export const MAX_MB_ADJUNTO = 25;

/** Extensión → tipo. Lo que no está aquí no se sube. */
export const TIPOS_PERMITIDOS: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain', md: 'text/markdown', json: 'application/json',
  zip: 'application/zip',
};

/** Lo que acepta el selector de archivos del navegador. */
export const ACEPTA_ADJUNTOS = Object.keys(TIPOS_PERMITIDOS).map((e) => '.' + e).join(',');

export function extensionDe(nombre: string): string {
  return (nombre.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? '').toLowerCase();
}

export function extensionPermitida(nombre: string): boolean {
  return extensionDe(nombre) in TIPOS_PERMITIDOS;
}

/** El tipo que se guarda: el de la extensión, que es más fiable que el que manda el navegador. */
export function mimeDe(nombre: string, mimeNavegador: string): string {
  return TIPOS_PERMITIDOS[extensionDe(nombre)] ?? mimeNavegador ?? 'application/octet-stream';
}

export function esImagen(mime: string): boolean {
  return mime.startsWith('image/');
}

export type ClaseAdjunto = 'imagen' | 'pdf' | 'documento' | 'hoja' | 'presentacion' | 'texto' | 'comprimido' | 'otro';

/** Para elegir icono y color. */
export function claseDe(nombre: string, mime: string): ClaseAdjunto {
  if (esImagen(mime)) return 'imagen';
  const e = extensionDe(nombre);
  if (e === 'pdf') return 'pdf';
  if (e === 'doc' || e === 'docx') return 'documento';
  if (e === 'xls' || e === 'xlsx' || e === 'csv') return 'hoja';
  if (e === 'ppt' || e === 'pptx') return 'presentacion';
  if (e === 'txt' || e === 'md' || e === 'json') return 'texto';
  if (e === 'zip') return 'comprimido';
  return 'otro';
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
