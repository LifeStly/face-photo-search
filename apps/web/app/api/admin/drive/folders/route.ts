import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, listIgnoredFolderIds } from '@/lib/db';
import { listFolders } from '@/lib/drive';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FolderInfo = {
  id: string;
  name: string;
  mode: 'live' | 'archive' | null;       // null = ยังไม่เริ่มงาน (SA เห็นแต่ไม่มีใน DB)
  isLive: boolean;
  photoCount: number;
  processedCount: number;
  totalCount: number;
  hasData: boolean;                       // มี run/photos ใน DB หรือเปล่า
  qrEnabled: boolean;
  hasPassword: boolean;
  qrCode: string | null;
  accessible: boolean;                    // SA ยัง access folder บน Drive ได้มั้ย
  lastSyncAt: number | null;
};

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });

  const ignored = new Set(listIgnoredFolderIds(tenantId));

  // 1) folder ที่ SA/OAuth ของ tenant เห็นใน Drive (Shared with me)
  let driveFolders: Array<{ id: string; name: string }> = [];
  try {
    const list = await listFolders(undefined, tenantId);
    driveFolders = list.map((f) => ({ id: f.id, name: f.name }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }

  // 2) folder ที่อยู่ใน DB (มีงานเก่า/Live/Archive) ภายใน tenant นี้
  const dbFolders = db().prepare(
    `SELECT
       r.folder_id AS folderId,
       (SELECT r2.folder_name FROM runs r2
         WHERE r2.tenant_id = ? AND r2.folder_id = r.folder_id AND r2.folder_name IS NOT NULL
         ORDER BY r2.started_at DESC LIMIT 1) AS storedName,
       MAX(CASE WHEN r.mode='live' AND r.status='running' THEN 1 ELSE 0 END) AS isLive,
       MAX(CASE WHEN r.mode='live' AND r.status='running' THEN 'live'
                ELSE 'archive' END) AS mode,
       (SELECT COUNT(*) FROM photos p
         JOIN runs r2 ON r2.id = p.run_id
         WHERE r2.tenant_id = ? AND r2.folder_id = r.folder_id) AS photoCount,
       (SELECT COUNT(*) FROM photos p
         JOIN runs r2 ON r2.id = p.run_id
         WHERE r2.tenant_id = ? AND r2.folder_id = r.folder_id AND p.processed_at IS NOT NULL) AS processedCount,
       MAX(r.started_at) AS lastSyncAt
     FROM runs r
     WHERE r.tenant_id = ?
     GROUP BY r.folder_id`
  ).all(tenantId, tenantId, tenantId, tenantId) as Array<{
    folderId: string;
    storedName: string | null;
    isLive: number;
    mode: 'live' | 'archive';
    photoCount: number;
    processedCount: number;
    lastSyncAt: number;
  }>;

  const dbMap = new Map(dbFolders.map((r) => [r.folderId, r]));
  const driveMap = new Map(driveFolders.map((f) => [f.id, f.name]));

  const codeRows = db().prepare(`SELECT folder_id, code, password_hash FROM event_codes WHERE tenant_id = ?`).all(tenantId) as Array<{
    folder_id: string; code: string; password_hash: string | null;
  }>;
  const codeMap = new Map<string, { code: string; hasPassword: boolean }>();
  for (const c of codeRows) {
    codeMap.set(c.folder_id, { code: c.code, hasPassword: !!c.password_hash });
  }

  // union ของ folder ids ที่จะแสดง: SA เห็น ∪ DB มี — ยกเว้น ignored
  const allIds = new Set<string>();
  for (const f of driveFolders) if (!ignored.has(f.id)) allIds.add(f.id);
  for (const r of dbFolders) if (!ignored.has(r.folderId)) allIds.add(r.folderId);

  const results: FolderInfo[] = [];
  for (const id of allIds) {
    const dbRow = dbMap.get(id);
    const driveName = driveMap.get(id);
    const accessible = driveMap.has(id);
    const codeInfo = codeMap.get(id);

    // ชื่อ: ถ้า SA ยังเห็น → ใช้ Drive name (สด), ไม่งั้น fall back DB
    const name = driveName ?? dbRow?.storedName ?? '(unknown)';

    results.push({
      id,
      name,
      mode: dbRow ? dbRow.mode : null,
      isLive: !!dbRow?.isLive,
      photoCount: dbRow?.photoCount ?? 0,
      processedCount: dbRow?.processedCount ?? 0,
      totalCount: dbRow?.photoCount ?? 0,
      hasData: !!dbRow,
      qrEnabled: !!codeInfo,
      hasPassword: codeInfo?.hasPassword ?? false,
      qrCode: codeInfo?.code ?? null,
      accessible,
      lastSyncAt: dbRow?.lastSyncAt ?? null,
    });
  }

  // เรียง: Live → Archive ที่มีข้อมูล → ที่ยังไม่เริ่ม
  results.sort((a, b) => {
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    return (b.lastSyncAt ?? 0) - (a.lastSyncAt ?? 0);
  });

  return NextResponse.json({ folders: results });
}
