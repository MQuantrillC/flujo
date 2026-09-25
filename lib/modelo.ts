// Los objetos que ven las páginas. Sin nada de SQL.

export interface Usuario {
  email: string;
  /** Nombre y apellido juntos: así se muestra en toda la app. */
  nombre: string;
  nombrePila: string;
  apellido: string;
  /** AAAA-MM-DD, si lo dio. */
  cumpleanos: string | null;
  /** Falso mientras sólo fue invitado a un equipo y aún no creó su cuenta. */
  tieneCuenta: boolean;
}

export interface Equipo { id: string; nombre: string; creadoPor: string; creadoEn: number; personal: boolean }

export interface Etapa { id: string; equipoId: string; nombre: string; posicion: number; esFinal: boolean }

export type Prioridad = 'normal' | 'alta';

/** Un enlace de la tarea; el nombre es opcional (sin él se muestra el servicio o el dominio). */
export interface Enlace { url: string; nombre: string }

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
  enlaces: Enlace[];
  comentarios: number;
  adjuntos: number;
  /** Grupo de pendientes vinculados entre equipos (comparten etapa y contenido); null si no tiene gemelos. */
  vinculoId: string | null;
  /** Cuántos gemelos tiene en otros equipos. */
  vinculadas: number;
  /** Sitio elegido a mano dentro de su columna; null si nunca se arrastró (va arriba, por plazo). */
  posicion: number | null;
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

export type TipoEvento = 'creada' | 'titulo' | 'descripcion' | 'etapa' | 'fecha' | 'prioridad' | 'asignados' | 'etiquetas' | 'enlaces' | 'comentario' | 'adjunto';

export interface Evento {
  id: string;
  tareaId: string;
  autor: string;
  tipo: TipoEvento;
  detalle: Record<string, unknown>;
  creadoEn: number;
}

/** Las cuatro etapas con las que nace un equipo, en el idioma de quien lo crea. La última es «hecho». */
export function etapasIniciales(idioma: 'es' | 'en' | 'pt'): string[] {
  return {
    es: ['Pendiente', 'En curso', 'En revisión', 'Hecho'],
    en: ['To do', 'In progress', 'In review', 'Done'],
    pt: ['Pendente', 'Em andamento', 'Em revisão', 'Feito'],
  }[idioma];
}

/** «harold.suarez@xertica.com» → «Harold Suarez». */
export function nombreDesdeCorreo(email: string): string {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || email;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}

export const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
