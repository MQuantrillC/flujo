// Los objetos que ven las páginas. Sin nada de SQL.

export interface Usuario { email: string; nombre: string }

export interface Equipo { id: string; nombre: string; creadoPor: string; creadoEn: number }

export interface Etapa { id: string; equipoId: string; nombre: string; posicion: number; esFinal: boolean }

export type Prioridad = 'normal' | 'alta';

export interface Tarea {
  id: string;
  equipoId: string;
  titulo: string;
  descripcion: string;
  etapaId: string;
  fechaLimite: string | null;
  prioridad: Prioridad;
  creadoPor: string;
  creadoEn: number;
  actualizadoEn: number;
  terminadoEn: number | null;
  asignados: string[];
  etiquetas: string[];
  comentarios: number;
  adjuntos: number;
}

export interface Adjunto {
  id: string;
  tareaId: string;
  comentarioId: string | null;
  nombre: string;
  mime: string;
  tamano: number;
  subidoPor: string;
  creadoEn: number;
}

export interface Comentario {
  id: string;
  tareaId: string;
  autor: string;
  texto: string;
  creadoEn: number;
  adjuntos: Adjunto[];
}

export type TipoEvento = 'creada' | 'titulo' | 'descripcion' | 'etapa' | 'fecha' | 'prioridad' | 'asignados' | 'etiquetas' | 'comentario' | 'adjunto';

export interface Evento {
  id: string;
  tareaId: string;
  autor: string;
  tipo: TipoEvento;
  detalle: Record<string, unknown>;
  creadoEn: number;
}

export const ETAPAS_INICIALES = ['Pendiente', 'En curso', 'En revisión', 'Hecho'];

/** «harold.suarez@xertica.com» → «Harold Suarez». */
export function nombreDesdeCorreo(email: string): string {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || email;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}
