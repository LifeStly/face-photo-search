import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from './config';

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(config.sqlite.path);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(config.sqlite.path);
  _db.pragma('journal_mode = WAL');
  _db.exec(SCHEMA);
  migrate(_db);
  return _db;
}

function migrate(d: Database.Database) {
  // ตรวจว่ายังมี UNIQUE บน drive_file_id อย่างเดียว (schema เก่า) — drop ออกถ้าเจอ
  const tbl = d.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='photos'`).get() as { sql: string } | undefined;
  if (tbl?.sql && /drive_file_id\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(tbl.sql)) {
    console.log(`${new Date().toISOString()} [db] migrating photos table: drop UNIQUE(drive_file_id) → UNIQUE(run_id, drive_file_id)`);
    // ปิด FK enforcement ระหว่าง migration (DROP TABLE photos จะกระทบ embeddings FK)
    d.pragma('foreign_keys = OFF');
    try {
      d.exec(`
        BEGIN;
        CREATE TABLE photos_new (
          id TEXT PRIMARY KEY,
          run_id INTEGER NOT NULL,
          drive_file_id TEXT NOT NULL,
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
        INSERT INTO photos_new SELECT * FROM photos;
        DROP TABLE photos;
        ALTER TABLE photos_new RENAME TO photos;
        CREATE INDEX IF NOT EXISTS idx_photos_run ON photos(run_id);
        CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_time DESC);
        CREATE INDEX IF NOT EXISTS idx_photos_pinned ON photos(pinned_at DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_run_drive ON photos(run_id, drive_file_id);
        COMMIT;
      `);
    } catch (e: any) {
      d.exec('ROLLBACK');
      throw e;
    } finally {
      d.pragma('foreign_keys = ON');
    }
  }

  // เพิ่ม column `mode` ใน runs (live | archive) — Live = sync อัตโนมัติ, ทีละ 1 folder
  const runsCols = d.prepare(`PRAGMA table_info(runs)`).all() as Array<{ name: string }>;
  if (!runsCols.find((c) => c.name === 'mode')) {
    console.log(`${new Date().toISOString()} [db] adding column runs.mode (default 'live')`);
    d.exec(`ALTER TABLE runs ADD COLUMN mode TEXT NOT NULL DEFAULT 'live'`);
  }
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
  status TEXT NOT NULL DEFAULT 'running',
  mode TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  run_id INTEGER NOT NULL,
  drive_file_id TEXT NOT NULL,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_run_drive ON photos(run_id, drive_file_id);

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

CREATE TABLE IF NOT EXISTS event_codes (
  code TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  password_hash TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_codes_folder ON event_codes(folder_id);

CREATE TABLE IF NOT EXISTS ignored_folders (
  folder_id TEXT PRIMARY KEY,
  ignored_at INTEGER NOT NULL
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
  status: 'running' | 'completed' | 'failed' | 'stopped';
  mode: 'live' | 'archive';
};

// activeRun = Live folder ที่ sync อยู่ — มีได้ทีละ 1 (Live ใหม่ต้องปิด Live เก่าก่อน)
export function activeRun(): RunRow | undefined {
  return db().prepare(`SELECT * FROM runs WHERE mode='live' AND status='running' ORDER BY id DESC LIMIT 1`).get() as RunRow | undefined;
}

// run ล่าสุดของ folder (ไม่ว่า mode/status ไหน) — ใช้สำหรับเช็คว่ามีข้อมูล folder นี้ใน DB หรือยัง
export function latestRunForFolder(folderId: string): RunRow | undefined {
  return db()
    .prepare(`SELECT * FROM runs WHERE folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(folderId) as RunRow | undefined;
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

// ลบข้อมูลทั้งหมดของ folder ใน DB (cascade: embeddings → photos → runs)
export function dropFolderData(folderId: string): { runs: number; photos: number; embeddings: number } {
  const d = db();
  let runs = 0, photos = 0, embeddings = 0;
  const tx = d.transaction(() => {
    embeddings = d.prepare(
      `DELETE FROM embeddings WHERE photo_id IN (
         SELECT p.id FROM photos p
         JOIN runs r ON r.id = p.run_id
         WHERE r.folder_id = ?
       )`
    ).run(folderId).changes;
    photos = d.prepare(
      `DELETE FROM photos WHERE run_id IN (SELECT id FROM runs WHERE folder_id = ?)`
    ).run(folderId).changes;
    runs = d.prepare(`DELETE FROM runs WHERE folder_id = ?`).run(folderId).changes;
    // ลบ event_codes ของ folder นี้ทิ้งด้วย (QR หมดอายุพร้อม folder)
    d.prepare(`DELETE FROM event_codes WHERE folder_id = ?`).run(folderId);
  });
  tx();
  return { runs, photos, embeddings };
}

export function isIgnored(folderId: string): boolean {
  return !!db().prepare(`SELECT 1 FROM ignored_folders WHERE folder_id=?`).get(folderId);
}

export function addIgnored(folderId: string) {
  db().prepare(`INSERT OR REPLACE INTO ignored_folders (folder_id, ignored_at) VALUES (?, ?)`)
    .run(folderId, Date.now());
}

export function removeIgnored(folderId: string) {
  db().prepare(`DELETE FROM ignored_folders WHERE folder_id=?`).run(folderId);
}

export function listIgnoredFolderIds(): string[] {
  return (db().prepare(`SELECT folder_id FROM ignored_folders`).all() as Array<{ folder_id: string }>)
    .map((r) => r.folder_id);
}

// resolve event code → run row (ใช้ใน Phase 2 หน้า /event/[code])
export function getEventCode(code: string): { code: string; folder_id: string; password_hash: string | null; created_at: number } | undefined {
  return db().prepare(`SELECT * FROM event_codes WHERE code=?`).get(code) as any;
}

// run ล่าสุดของ folder ที่มีข้อมูล (ใช้ใน Event page query photos/embeddings)
export function latestRunIdForFolder(folderId: string): number | undefined {
  const row = db()
    .prepare(`SELECT id FROM runs WHERE folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(folderId) as { id: number } | undefined;
  return row?.id;
}
