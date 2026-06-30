import crypto from 'crypto';
import { db, DEFAULT_TENANT_ID } from './db';
import { config } from './config';
import { getSession } from './auth';

export type TenantStatus = 'active' | 'suspended' | 'expired';

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  expires_at: number | null;
  created_at: number;
  settings_json: string | null;
};

export type DriveSourceRow = {
  id: string;
  tenant_id: string;
  type: 'sa' | 'oauth';
  sa_file_path: string | null;
  oauth_tokens_json: string | null;
  folder_id: string | null;
  updated_at: number;
};

export type QuotaRow = {
  tenant_id: string;
  monthly_photo_limit: number | null;
  monthly_search_limit: number | null;
  storage_byte_limit: number | null;
  period_start: number;
};

export type UsageRow = {
  tenant_id: string;
  period_yyyymm: number;
  photos_processed: number;
  searches: number;
  storage_bytes: number;
};

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function periodYYYYMM(d = new Date()): number {
  return d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1);
}

// ── tenant CRUD ───────────────────────────────────────────────────────────────

export function listTenants(): TenantRow[] {
  return db().prepare(`SELECT * FROM tenants ORDER BY created_at DESC`).all() as TenantRow[];
}

export function getTenant(id: string): TenantRow | undefined {
  return db().prepare(`SELECT * FROM tenants WHERE id = ?`).get(id) as TenantRow | undefined;
}

export function getTenantBySlug(slug: string): TenantRow | undefined {
  return db().prepare(`SELECT * FROM tenants WHERE slug = ?`).get(slug) as TenantRow | undefined;
}

export function createTenant(args: { name: string; slug: string; expiresAt?: number | null }): TenantRow {
  const id = newId('tnt');
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO tenants (id, name, slug, status, expires_at, created_at, settings_json)
       VALUES (?, ?, ?, 'active', ?, ?, NULL)`
    )
    .run(id, args.name, args.slug, args.expiresAt ?? null, now);
  return getTenant(id)!;
}

export function updateTenant(
  id: string,
  patch: Partial<Pick<TenantRow, 'name' | 'slug' | 'status' | 'expires_at'>>
) {
  const fields: string[] = [];
  const vals: any[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); vals.push(patch.name); }
  if (patch.slug !== undefined) { fields.push('slug = ?'); vals.push(patch.slug); }
  if (patch.status !== undefined) { fields.push('status = ?'); vals.push(patch.status); }
  if (patch.expires_at !== undefined) { fields.push('expires_at = ?'); vals.push(patch.expires_at); }
  if (!fields.length) return;
  vals.push(id);
  db().prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
}

/**
 * ลบ tenant + cascade data ทั้งหมดของมัน
 * (FK ใน SQLite ไม่ enforce ลึก ⇒ ลบเองทุกตารางที่ scope ด้วย tenant_id)
 */
export function deleteTenant(id: string) {
  if (id === DEFAULT_TENANT_ID) throw new Error('cannot delete default tenant');
  const d = db();
  const tx = d.transaction(() => {
    d.prepare(`DELETE FROM embeddings WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM photos WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM runs WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM event_codes WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM ignored_folders WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM settings WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM usage_counters WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM quotas WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM drive_sources WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM users WHERE tenant_id = ?`).run(id);
    d.prepare(`DELETE FROM tenants WHERE id = ?`).run(id);
  });
  tx();
}

export function listAuditLog(opts: { tenantId?: string; limit?: number; offset?: number } = {}) {
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  if (opts.tenantId) {
    return db()
      .prepare(`SELECT * FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(opts.tenantId, limit, offset);
  }
  return db()
    .prepare(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset);
}

/** check ว่า tenant หมดอายุ/ถูก suspend หรือยัง — ใช้ใน admin guard */
export function isTenantUsable(tenantId: string): boolean {
  const t = getTenant(tenantId);
  if (!t) return false;
  if (t.status !== 'active') return false;
  if (t.expires_at != null && t.expires_at < Date.now()) return false;
  return true;
}

// ── access control ───────────────────────────────────────────────────────────

/**
 * คืน tenant_id ที่ session ปัจจุบันมีสิทธิเข้า — portable mode ⇒ 'default' เสมอ
 * คืน null ถ้าไม่มี session หรือไม่ valid
 */
export async function getCurrentTenantId(): Promise<string | null> {
  if (config.app.mode === 'portable') return DEFAULT_TENANT_ID;
  const s = await getSession();
  if (!s.admin) return null;
  return s.tenantId ?? null;
}

/**
 * ตรวจว่า session ปัจจุบันเข้า tenant ที่ขอได้ไหม
 * - portable: ได้เฉพาะ 'default'
 * - saas + super: เข้าได้ทุก tenant
 * - saas + tenant_admin: เข้าได้แต่ tenant ของตัวเอง
 */
export async function assertTenantAccess(requestedTenantId: string): Promise<boolean> {
  const s = await getSession();
  if (!s.admin) return false;
  if (config.app.mode === 'portable') return requestedTenantId === DEFAULT_TENANT_ID;
  if (s.role === 'super') return true;
  if (s.role === 'tenant_admin') return s.tenantId === requestedTenantId;
  return false;
}

// ── drive sources ────────────────────────────────────────────────────────────

export function getDriveSourceForTenant(tenantId: string): DriveSourceRow | undefined {
  return db()
    .prepare(`SELECT * FROM drive_sources WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 1`)
    .get(tenantId) as DriveSourceRow | undefined;
}

export function upsertDriveSource(args: {
  tenantId: string;
  type: 'sa' | 'oauth';
  saFilePath?: string | null;
  oauthTokensJson?: string | null;
  folderId?: string | null;
}): DriveSourceRow {
  const existing = getDriveSourceForTenant(args.tenantId);
  const now = Date.now();
  if (existing) {
    db()
      .prepare(
        `UPDATE drive_sources
         SET type = ?, sa_file_path = ?, oauth_tokens_json = ?, folder_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        args.type,
        args.saFilePath ?? null,
        args.oauthTokensJson ?? null,
        args.folderId ?? null,
        now,
        existing.id
      );
    return getDriveSourceForTenant(args.tenantId)!;
  }
  const id = newId('drv');
  db()
    .prepare(
      `INSERT INTO drive_sources (id, tenant_id, type, sa_file_path, oauth_tokens_json, folder_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      args.tenantId,
      args.type,
      args.saFilePath ?? null,
      args.oauthTokensJson ?? null,
      args.folderId ?? null,
      now
    );
  return getDriveSourceForTenant(args.tenantId)!;
}

// ── quota + usage ────────────────────────────────────────────────────────────

export function getQuota(tenantId: string): QuotaRow | undefined {
  return db().prepare(`SELECT * FROM quotas WHERE tenant_id = ?`).get(tenantId) as QuotaRow | undefined;
}

export function setQuota(args: {
  tenantId: string;
  monthlyPhotoLimit?: number | null;
  monthlySearchLimit?: number | null;
  storageByteLimit?: number | null;
}) {
  const existing = getQuota(args.tenantId);
  if (existing) {
    db()
      .prepare(
        `UPDATE quotas
         SET monthly_photo_limit = ?, monthly_search_limit = ?, storage_byte_limit = ?
         WHERE tenant_id = ?`
      )
      .run(
        args.monthlyPhotoLimit ?? null,
        args.monthlySearchLimit ?? null,
        args.storageByteLimit ?? null,
        args.tenantId
      );
    return;
  }
  db()
    .prepare(
      `INSERT INTO quotas (tenant_id, monthly_photo_limit, monthly_search_limit, storage_byte_limit, period_start)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      args.tenantId,
      args.monthlyPhotoLimit ?? null,
      args.monthlySearchLimit ?? null,
      args.storageByteLimit ?? null,
      Date.now()
    );
}

export function getUsage(tenantId: string, period = periodYYYYMM()): UsageRow {
  const row = db()
    .prepare(`SELECT * FROM usage_counters WHERE tenant_id = ? AND period_yyyymm = ?`)
    .get(tenantId, period) as UsageRow | undefined;
  return row ?? {
    tenant_id: tenantId,
    period_yyyymm: period,
    photos_processed: 0,
    searches: 0,
    storage_bytes: 0,
  };
}

export function incrementUsage(
  tenantId: string,
  patch: { photos?: number; searches?: number; storageBytesDelta?: number }
) {
  const period = periodYYYYMM();
  db()
    .prepare(
      `INSERT INTO usage_counters (tenant_id, period_yyyymm, photos_processed, searches, storage_bytes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, period_yyyymm) DO UPDATE SET
         photos_processed = photos_processed + excluded.photos_processed,
         searches         = searches         + excluded.searches,
         storage_bytes    = storage_bytes    + excluded.storage_bytes`
    )
    .run(
      tenantId,
      period,
      patch.photos ?? 0,
      patch.searches ?? 0,
      patch.storageBytesDelta ?? 0
    );
}

// ── audit log ────────────────────────────────────────────────────────────────

export function logAudit(args: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  target?: string | null;
  meta?: Record<string, unknown>;
}) {
  db()
    .prepare(
      `INSERT INTO audit_log (tenant_id, user_id, action, target, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      args.tenantId ?? null,
      args.userId ?? null,
      args.action,
      args.target ?? null,
      args.meta ? JSON.stringify(args.meta) : null,
      Date.now()
    );
}
