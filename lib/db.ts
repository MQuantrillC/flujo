// ──────────────────────────────────────────────────────────────────────────────
// BASE DE DATOS — SQLite en data/flujo.db (o en FLUJO_DATA_DIR), con las tablas
// creadas al abrir y las columnas nuevas añadidas a bases que ya existían.
//
// Toda la lectura y escritura pasa por lib/repositorio.ts: si un día esto se
// muda a Postgres u otra base, se cambia ese archivo y nada más.
// ──────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DATA_DIR = process.env.FLUJO_DATA_DIR ? path.resolve(process.env.FLUJO_DATA_DIR) : path.join(process.cwd(), 'data');
export const ADJUNTOS_DIR = path.join(DATA_DIR, 'adjuntos');

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  email TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL DEFAULT '',
  cumpleanos TEXT,
  hash TEXT,
  creado_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  creado_en INTEGER NOT NULL,
  expira_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS equipos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  creado_por TEXT NOT NULL,
  creado_en INTEGER NOT NULL,
  personal INTEGER NOT NULL DEFAULT 0
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
CREATE INDEX IF NOT EXISTS asignados_email ON asignados(email);
CREATE TABLE IF NOT EXISTS etiquetas (
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  etiqueta TEXT NOT NULL,
  PRIMARY KEY (tarea_id, etiqueta)
);
CREATE TABLE IF NOT EXISTS enlaces (
  tarea_id TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  posicion INTEGER NOT NULL,
  PRIMARY KEY (tarea_id, url)
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

/** Columnas que se sumaron después de la primera versión; en una base nueva ya vienen en el esquema. */
const COLUMNAS_NUEVAS: [tabla: string, columna: string, definicion: string][] = [
  ['usuarios', 'apellido', "TEXT NOT NULL DEFAULT ''"],
  ['usuarios', 'cumpleanos', 'TEXT'],
  ['usuarios', 'hash', 'TEXT'],
  ['equipos', 'personal', 'INTEGER NOT NULL DEFAULT 0'],
  ['enlaces', 'nombre', "TEXT NOT NULL DEFAULT ''"],
  // Pendientes vinculados entre equipos: comparten este id (el del primero).
  ['tareas', 'vinculo_id', 'TEXT'],
  // Orden a mano dentro de la columna (arrastrando). NULL = nunca se ordenó: va arriba, por plazo.
  ['tareas', 'posicion', 'REAL'],
];

function migrar(db: Database.Database): void {
  for (const [tabla, columna, definicion] of COLUMNAS_NUEVAS) {
    const existentes = (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map((c) => c.name);
    if (!existentes.includes(columna)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
  }
}

function abrir(): Database.Database {
  fs.mkdirSync(ADJUNTOS_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, 'flujo.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(ESQUEMA);
  migrar(db);
  return db;
}

// Una sola conexión, que sobrevive a las recargas del servidor de desarrollo.
const g = globalThis as unknown as { __flujoDb?: Database.Database };
export const db: Database.Database = g.__flujoDb ?? (g.__flujoDb = abrir());
