import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from './config';

// tenant สำหรับ portable mode + เป็น row default ที่ saas mode จะ migrate data เก่ามาลง
export const DEFAULT_TENANT_ID = 'default';

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(config.sqlite.path);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(config.sqlite.path);
  _db.pragma('journal_mode = WAL');
  _db.exec(SCHEMA);
  migrate(_db);
  seedDefaultTenant(_db);
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

  // ── multi-tenant migration (Phase A) ─────────────────────────────────────
  // เพิ่ม tenant_id ในตารางที่มี data — backfill 'default' ให้แถวที่มีอยู่
  // ตารางอื่น (tenants/users/quotas/...) สร้างผ่าน SCHEMA แล้ว
  addTenantIdIfMissing(d, 'runs', { nullable: false, defaultValue: DEFAULT_TENANT_ID });
  addTenantIdIfMissing(d, 'photos', { nullable: false, defaultValue: DEFAULT_TENANT_ID });
  addTenantIdIfMissing(d, 'embeddings', { nullable: false, defaultValue: DEFAULT_TENANT_ID });
  addTenantIdIfMissing(d, 'event_codes', { nullable: false, defaultValue: DEFAULT_TENANT_ID });
  addTenantIdIfMissing(d, 'ignored_folders', { nullable: false, defaultValue: DEFAULT_TENANT_ID });
  addTenantIdIfMissing(d, 'settings', { nullable: true });
}

/**
 * SQLite ไม่รองรับ ALTER TABLE ADD COLUMN ถ้ามี constraint NOT NULL DEFAULT แบบ non-constant —
 * แต่ TEXT NOT NULL DEFAULT 'default' (ค่าคงที่) ใช้ได้, รวมถึง NULL column ก็ใช้ได้
 */
function addTenantIdIfMissing(
  d: Database.Database,
  table: string,
  opts: { nullable: boolean; defaultValue?: string }
) {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.find((c) => c.name === 'tenant_id')) return;
  const constraint = opts.nullable
    ? 'TEXT'
    : `TEXT NOT NULL DEFAULT '${opts.defaultValue ?? DEFAULT_TENANT_ID}'`;
  console.log(`${new Date().toISOString()} [db] adding column ${table}.tenant_id (${constraint})`);
  d.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id ${constraint}`);
}

/**
 * รับรองว่ามี tenants(id='default') อยู่เสมอ — กัน FK violation กรณี data เก่า migrate มา
 * + เป็นบ้านถาวรของ portable mode (ไม่มีทาง spawn tenant อื่น)
 */
function seedDefaultTenant(d: Database.Database) {
  const exists = d.prepare(`SELECT 1 FROM tenants WHERE id = ?`).get(DEFAULT_TENANT_ID);
  if (exists) return;
  console.log(`${new Date().toISOString()} [db] seeding default tenant`);
  d.prepare(
    `INSERT INTO tenants (id, name, slug, status, expires_at, created_at, settings_json)
     VALUES (?, ?, ?, 'active', NULL, ?, NULL)`
  ).run(DEFAULT_TENANT_ID, 'Default', 'default', Date.now());
}

const SCHEMA = `
-- ── multi-tenant core (Phase A) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired')),
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  settings_json TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('super','tenant_admin')),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS drive_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sa','oauth')),
  sa_file_path TEXT,
  oauth_tokens_json TEXT,
  folder_id TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_drive_sources_tenant ON drive_sources(tenant_id);

CREATE TABLE IF NOT EXISTS quotas (
  tenant_id TEXT PRIMARY KEY,
  monthly_photo_limit INTEGER,
  monthly_search_limit INTEGER,
  storage_byte_limit INTEGER,
  period_start INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS usage_counters (
  tenant_id TEXT NOT NULL,
  period_yyyymm INTEGER NOT NULL,
  photos_processed INTEGER NOT NULL DEFAULT 0,
  searches INTEGER NOT NULL DEFAULT 0,
  storage_bytes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, period_yyyymm),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_log(user_id, created_at DESC);

-- ── existing tables (กับ tenant_id ถ้าเป็น install ใหม่) ───────────────────
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
  mode TEXT NOT NULL DEFAULT 'live',
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_runs_tenant ON runs(tenant_id);

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
  tenant_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_photos_run ON photos(run_id);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_time DESC);
CREATE INDEX IF NOT EXISTS idx_photos_pinned ON photos(pinned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_run_drive ON photos(run_id, drive_file_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant_created ON photos(tenant_id, created_time DESC);

CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id TEXT NOT NULL,
  descriptor BLOB NOT NULL,
  box_x REAL, box_y REAL, box_w REAL, box_h REAL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_photo ON embeddings(photo_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_tenant ON embeddings(tenant_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER,
  tenant_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_settings_tenant ON settings(tenant_id);

CREATE TABLE IF NOT EXISTS event_codes (
  code TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  password_hash TEXT,
  created_at INTEGER NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_event_codes_folder ON event_codes(folder_id);
CREATE INDEX IF NOT EXISTS idx_event_codes_tenant ON event_codes(tenant_id);

CREATE TABLE IF NOT EXISTS ignored_folders (
  folder_id TEXT PRIMARY KEY,
  ignored_at INTEGER NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_ignored_folders_tenant ON ignored_folders(tenant_id);
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

// activeRun = Live folder ที่ sync อยู่ — มีได้ทีละ 1 ต่อ tenant
export function activeRun(tenantId: string = DEFAULT_TENANT_ID): RunRow | undefined {
  return db()
    .prepare(`SELECT * FROM runs WHERE tenant_id=? AND mode='live' AND status='running' ORDER BY id DESC LIMIT 1`)
    .get(tenantId) as RunRow | undefined;
}

// run ล่าสุดของ folder (ไม่ว่า mode/status ไหน) — ใช้สำหรับเช็คว่ามีข้อมูล folder นี้ใน DB หรือยัง
export function latestRunForFolder(folderId: string, tenantId: string = DEFAULT_TENANT_ID): RunRow | undefined {
  return db()
    .prepare(`SELECT * FROM runs WHERE tenant_id=? AND folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(tenantId, folderId) as RunRow | undefined;
}

export function listPhotos(
  opts: { limit?: number; offset?: number; runId?: number; includeHidden?: boolean; tenantId?: string } = {}
): PhotoRow[] {
  const limit = opts.limit ?? 60;
  const offset = opts.offset ?? 0;
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const runId = opts.runId ?? activeRun(tenantId)?.id;
  if (!runId) return [];
  const where = opts.includeHidden ? '' : 'AND hidden = 0';
  return db()
    .prepare(
      `SELECT * FROM photos WHERE tenant_id=? AND run_id=? ${where}
       ORDER BY pinned_at DESC NULLS LAST, created_time DESC, processed_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(tenantId, runId, limit, offset) as PhotoRow[];
}

export function listFailedPhotos(runId?: number, tenantId: string = DEFAULT_TENANT_ID): PhotoRow[] {
  const rid = runId ?? activeRun(tenantId)?.id;
  if (!rid) return [];
  return db()
    .prepare(`SELECT * FROM photos WHERE tenant_id=? AND run_id=? AND failed_at IS NOT NULL`)
    .all(tenantId, rid) as PhotoRow[];
}

export function getPhoto(id: string, tenantId?: string): PhotoRow | undefined {
  if (tenantId) {
    return db().prepare(`SELECT * FROM photos WHERE id=? AND tenant_id=?`).get(id, tenantId) as PhotoRow | undefined;
  }
  return db().prepare(`SELECT * FROM photos WHERE id=?`).get(id) as PhotoRow | undefined;
}

export function allEmbeddings(runId?: number, tenantId: string = DEFAULT_TENANT_ID): EmbeddingRow[] {
  const rid = runId ?? activeRun(tenantId)?.id;
  if (!rid) return [];
  return db()
    .prepare(`SELECT e.* FROM embeddings e JOIN photos p ON p.id = e.photo_id WHERE p.tenant_id=? AND p.run_id=? AND p.hidden = 0`)
    .all(tenantId, rid) as EmbeddingRow[];
}

// ลบข้อมูลทั้งหมดของ folder ใน DB (cascade: embeddings → photos → runs); scope ด้วย tenant_id
export function dropFolderData(folderId: string, tenantId: string = DEFAULT_TENANT_ID): { runs: number; photos: number; embeddings: number } {
  const d = db();
  let runs = 0, photos = 0, embeddings = 0;
  const tx = d.transaction(() => {
    embeddings = d.prepare(
      `DELETE FROM embeddings WHERE photo_id IN (
         SELECT p.id FROM photos p
         JOIN runs r ON r.id = p.run_id
         WHERE r.tenant_id = ? AND r.folder_id = ?
       )`
    ).run(tenantId, folderId).changes;
    photos = d.prepare(
      `DELETE FROM photos WHERE tenant_id = ? AND run_id IN (SELECT id FROM runs WHERE tenant_id = ? AND folder_id = ?)`
    ).run(tenantId, tenantId, folderId).changes;
    runs = d.prepare(`DELETE FROM runs WHERE tenant_id = ? AND folder_id = ?`).run(tenantId, folderId).changes;
    d.prepare(`DELETE FROM event_codes WHERE tenant_id = ? AND folder_id = ?`).run(tenantId, folderId);
  });
  tx();
  return { runs, photos, embeddings };
}

export function isIgnored(folderId: string, tenantId: string = DEFAULT_TENANT_ID): boolean {
  return !!db().prepare(`SELECT 1 FROM ignored_folders WHERE tenant_id=? AND folder_id=?`).get(tenantId, folderId);
}

export function addIgnored(folderId: string, tenantId: string = DEFAULT_TENANT_ID) {
  db().prepare(`INSERT OR REPLACE INTO ignored_folders (folder_id, ignored_at, tenant_id) VALUES (?, ?, ?)`)
    .run(folderId, Date.now(), tenantId);
}

export function removeIgnored(folderId: string, tenantId: string = DEFAULT_TENANT_ID) {
  db().prepare(`DELETE FROM ignored_folders WHERE tenant_id=? AND folder_id=?`).run(tenantId, folderId);
}

export function listIgnoredFolderIds(tenantId: string = DEFAULT_TENANT_ID): string[] {
  return (db().prepare(`SELECT folder_id FROM ignored_folders WHERE tenant_id=?`).all(tenantId) as Array<{ folder_id: string }>)
    .map((r) => r.folder_id);
}

// resolve event code → row (code unique ทั้ง DB; tenant_id ติดมาจาก row เพื่อ resolve scope)
export function getEventCode(code: string): { code: string; folder_id: string; password_hash: string | null; created_at: number; tenant_id: string } | undefined {
  return db().prepare(`SELECT * FROM event_codes WHERE code=?`).get(code) as any;
}

// run ล่าสุดของ folder ที่มีข้อมูล (ใช้ใน Event page query photos/embeddings)
export function latestRunIdForFolder(folderId: string, tenantId: string = DEFAULT_TENANT_ID): number | undefined {
  const row = db()
    .prepare(`SELECT id FROM runs WHERE tenant_id=? AND folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(tenantId, folderId) as { id: number } | undefined;
  return row?.id;
}
