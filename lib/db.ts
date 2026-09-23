// ──────────────────────────────────────────────────────────────────────────────
// BASE DE DATOS — SQLite en data/flujo.db, con las tablas creadas al abrir.
//
// Por ahora todo vive en la máquina donde corre la app. Toda la lectura y
// escritura pasa por lib/repositorio.ts: si un día esto se muda a Firestore u
// otra base, se cambia ese archivo y nada más.
// ──────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const ADJUNTOS_DIR = path.join(DATA_DIR, 'adjuntos');

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  email TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  creado_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS equipos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  creado_por TEXT NOT NULL,
  creado_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS miembros (
  equipo_id TEXT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  agregado_en INTEGER NOT NULL,
  PRIMARY KEY (equipo_id, email)
);
CREATE TABLE IF NOT EXISTS etapas (
  id TEXT PRIMARY KEY,
  equipo_id TEXT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  posicion INTEGER NOT NULL,
  es_final INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  equipo_id TEXT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  etapa_id TEXT NOT NULL REFERENCES etapas(id),
  fecha_limite TEXT,
  prioridad TEXT NOT NULL DEFAULT 'normal',
  creado_por TEXT NOT NULL,
  creado_en INTEGER NOT NULL,
  actualizado_en INTEGER NOT NULL,
  terminado_en INTEGER
);
CREATE INDEX IF NOT EXISTS tareas_equipo ON tareas(equipo_id, etapa_id);
CREATE TABLE IF NOT EXISTS asignados (
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  PRIMARY KEY (tarea_id, email)
);
CREATE TABLE IF NOT EXISTS etiquetas (
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  etiqueta TEXT NOT NULL,
  PRIMARY KEY (tarea_id, etiqueta)
);
CREATE TABLE IF NOT EXISTS comentarios (
  id TEXT PRIMARY KEY,
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  texto TEXT NOT NULL,
  creado_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS adjuntos (
  id TEXT PRIMARY KEY,
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  comentario_id TEXT REFERENCES comentarios(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  mime TEXT NOT NULL,
  tamano INTEGER NOT NULL,
  ruta TEXT NOT NULL,
  subido_por TEXT NOT NULL,
  creado_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  tipo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '{}',
  creado_en INTEGER NOT NULL
);
`;

function abrir(): Database.Database {
  fs.mkdirSync(ADJUNTOS_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, 'flujo.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(ESQUEMA);
  return db;
}

// Una sola conexión, que sobrevive a las recargas del servidor de desarrollo.
const g = globalThis as unknown as { __flujoDb?: Database.Database };
export const db: Database.Database = g.__flujoDb ?? (g.__flujoDb = abrir());
