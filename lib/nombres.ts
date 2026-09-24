// Cómo llamar a alguien en corto cuando hay poco espacio (la tarjeta del
// equipo, las fichas de @, el historial): «Marco» si es el único Marco; si hay
// dos, «Marco Q» y «Marco V»; si ni así se distinguen, el nombre entero; y si
// tampoco, el correo.

export interface ConNombre { email: string; nombre: string }

const partes = (nombre: string) => nombre.trim().split(/\s+/).filter(Boolean);
const clave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const NIVELES: ((p: ConNombre) => string)[] = [
  (p) => partes(p.nombre)[0] ?? '',
  (p) => { const [a, b] = partes(p.nombre); return b ? `${a} ${b[0].toUpperCase()}` : (a ?? ''); },
  (p) => p.nombre.trim(),
  (p) => p.email,
];

/** El nombre corto de cada persona, por correo, distinguible dentro del grupo dado. */
export function nombresCortos(personas: ConNombre[]): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const p of personas) {
    resultado[p.email] = p.email;
    for (const nivel of NIVELES) {
      const mio = nivel(p);
      if (!mio) continue;
      const repetido = personas.some((o) => o.email !== p.email && clave(nivel(o)) === clave(mio));
      if (!repetido) { resultado[p.email] = mio; break; }
    }
  }
  return resultado;
}
