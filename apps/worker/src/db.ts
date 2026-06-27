import Database from 'better-sqlite3';
import { config } from './config';

let _db: Database.Database | null = null;
export function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(config.sqlite.path);
  _db.pragma('journal_mode = WAL');
  _db.exec(SCHEMA);
  return _db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id TEXT NOT NULL,
  folder_name TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  total_photos INTEGER DEFAULT 0,
  processed_photos INTEGER DEFAULT 0,
  failed_photos INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  run_id INTEGER NOT NULL,
  drive_file_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  download_url TEXT,
  view_url TEXT,
  created_time INTEGER,
  face_count INTEGER DEFAULT 0,
  processed_at INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0,
  pinned_at INTEGER,
  failed_at INTEGER,
  fail_reason TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_photos_run ON photos(run_id);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_time DESC);
CREATE INDEX IF NOT EXISTS idx_photos_pinned ON photos(pinned_at DESC);

CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id TEXT NOT NULL,
  descriptor BLOB NOT NULL,
  box_x REAL, box_y REAL, box_w REAL, box_h REAL,
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_photo ON embeddings(photo_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);
`;
