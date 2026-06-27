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

export type PhotoRow = {
  id: string;
  run_id: number;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  download_url: string | null;
  view_url: string | null;
  created_time: number | null;
  face_count: number;
  processed_at: number | null;
  hidden: number;
  pinned_at: number | null;
  failed_at: number | null;
  fail_reason: string | null;
};

export type EmbeddingRow = {
  id: number;
  photo_id: string;
  descriptor: Buffer;
  box_x: number; box_y: number; box_w: number; box_h: number;
};

export type RunRow = {
  id: number;
  folder_id: string;
  folder_name: string | null;
  started_at: number;
  finished_at: number | null;
  total_photos: number;
  processed_photos: number;
  failed_photos: number;
  status: 'running' | 'completed' | 'failed';
};

export function activeRun(): RunRow | undefined {
  return db().prepare(`SELECT * FROM runs WHERE status='running' ORDER BY id DESC LIMIT 1`).get() as RunRow | undefined;
}

export function listPhotos(opts: { limit?: number; offset?: number; runId?: number; includeHidden?: boolean } = {}): PhotoRow[] {
  const limit = opts.limit ?? 60;
  const offset = opts.offset ?? 0;
  const runId = opts.runId ?? activeRun()?.id;
  if (!runId) return [];
  const where = opts.includeHidden ? '' : 'AND hidden = 0';
  return db()
    .prepare(
      `SELECT * FROM photos WHERE run_id=? ${where}
       ORDER BY pinned_at DESC NULLS LAST, created_time DESC, processed_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(runId, limit, offset) as PhotoRow[];
}

export function listFailedPhotos(runId?: number): PhotoRow[] {
  const rid = runId ?? activeRun()?.id;
  if (!rid) return [];
  return db()
    .prepare(`SELECT * FROM photos WHERE run_id=? AND failed_at IS NOT NULL`)
    .all(rid) as PhotoRow[];
}

export function getPhoto(id: string): PhotoRow | undefined {
  return db().prepare(`SELECT * FROM photos WHERE id=?`).get(id) as PhotoRow | undefined;
}

export function allEmbeddings(runId?: number): EmbeddingRow[] {
  const rid = runId ?? activeRun()?.id;
  if (!rid) return [];
  return db()
    .prepare(`SELECT e.* FROM embeddings e JOIN photos p ON p.id = e.photo_id WHERE p.run_id=? AND p.hidden = 0`)
    .all(rid) as EmbeddingRow[];
}
