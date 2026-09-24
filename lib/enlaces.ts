// ──────────────────────────────────────────────────────────────────────────────
// ENLACES — direcciones web dentro de un texto: se detectan, se limpian y se les
// pone un nombre corto («Google Docs», «Salesforce», «github.com») para mostrarlos
// como fichas en vez de como una URL larga. Puro, con pruebas.
// ──────────────────────────────────────────────────────────────────────────────

const RE_ENLACE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/** Quita la puntuación que suele pegarse al final («…/doc).» → «…/doc») y pone https:// a los «www.». */
export function normalizarEnlace(url: string): string {
  let u = url.trim().replace(/[.,;:!?'")\]]+$/, '');
  // Un paréntesis final sólo se queda si abre dentro del mismo enlace (Wikipedia, por ejemplo).
  if (url.endsWith(')') && (u.match(/\(/g)?.length ?? 0) > (u.match(/\)/g)?.length ?? 0)) u += ')';
  if (/^www\./i.test(u)) u = 'https://' + u;
  return u;
}

export function extraerEnlaces(texto: string): string[] {
  const lista: string[] = [];
  for (const m of texto.matchAll(RE_ENLACE)) {
    const u = normalizarEnlace(m[0]);
    if (u && !lista.includes(u)) lista.push(u);
  }
  return lista;
}

const CONOCIDOS: [dominio: string, nombre: string][] = [
  ['docs.google.com', 'Google Docs'], ['sheets.google.com', 'Google Sheets'], ['slides.google.com', 'Google Slides'],
  ['forms.google.com', 'Google Forms'], ['drive.google.com', 'Google Drive'], ['meet.google.com', 'Google Meet'],
  ['calendar.google.com', 'Google Calendar'], ['mail.google.com', 'Gmail'], ['gemini.google.com', 'Gemini'],
  ['console.cloud.google.com', 'Google Cloud'], ['cloud.google.com', 'Google Cloud'], ['lookerstudio.google.com', 'Looker Studio'],
  ['youtube.com', 'YouTube'], ['youtu.be', 'YouTube'],
  ['salesforce.com', 'Salesforce'], ['force.com', 'Salesforce'], ['hubspot.com', 'HubSpot'],
  ['github.com', 'GitHub'], ['gitlab.com', 'GitLab'], ['bitbucket.org', 'Bitbucket'],
  ['figma.com', 'Figma'], ['canva.com', 'Canva'], ['miro.com', 'Miro'], ['lucid.app', 'Lucidchart'],
  ['notion.so', 'Notion'], ['notion.site', 'Notion'], ['atlassian.net', 'Jira'], ['trello.com', 'Trello'],
  ['asana.com', 'Asana'], ['monday.com', 'monday.com'], ['clickup.com', 'ClickUp'], ['linear.app', 'Linear'],
  ['slack.com', 'Slack'], ['teams.microsoft.com', 'Teams'], ['sharepoint.com', 'SharePoint'], ['onedrive.live.com', 'OneDrive'],
  ['office.com', 'Microsoft 365'], ['microsoft.com', 'Microsoft'], ['zoom.us', 'Zoom'], ['loom.com', 'Loom'],
  ['dropbox.com', 'Dropbox'], ['linkedin.com', 'LinkedIn'], ['claude.ai', 'Claude'], ['chatgpt.com', 'ChatGPT'],
  ['vercel.com', 'Vercel'], ['railway.app', 'Railway'], ['wikipedia.org', 'Wikipedia'],
];

/** Un nombre corto para el enlace: el servicio si es conocido, si no el dominio sin «www.». */
export function etiquetaEnlace(url: string): string {
  let host = '';
  try { host = new URL(normalizarEnlace(url)).hostname.toLowerCase(); } catch { return url; }
  const conocido = CONOCIDOS.find(([d]) => host === d || host.endsWith('.' + d));
  return conocido ? conocido[1] : host.replace(/^www\./, '');
}

export type Trozo = { tipo: 'texto'; valor: string } | { tipo: 'enlace'; valor: string; url: string };

/** Parte un texto en trozos normales y enlaces, para pintar los enlaces como tales. */
export function partirEnlaces(texto: string): Trozo[] {
  const trozos: Trozo[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(RE_ENLACE)) {
    const inicio = m.index ?? 0;
    const crudo = m[0];
    const limpio = crudo.replace(/[.,;:!?'")\]]+$/, '');
    const fin = inicio + limpio.length;
    if (inicio > ultimo) trozos.push({ tipo: 'texto', valor: texto.slice(ultimo, inicio) });
    trozos.push({ tipo: 'enlace', valor: limpio, url: normalizarEnlace(crudo) });
    ultimo = fin;
  }
  if (ultimo < texto.length) trozos.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  return trozos;
}
