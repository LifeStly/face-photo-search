import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { activeRun, db } from '@/lib/db';
import { queueStats } from '@/lib/queue';
import { ensureBooted } from '@/lib/boot';
import { getFolderName } from '@/lib/drive';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// in-memory cache so we don't hit Drive every poll (status is polled every 3s)
const nameCache = new Map<string, string>();

// "????" = ชื่อที่เพี้ยน (non-UTF-8 path เคยเก็บลง DB) → ดึงสดจาก Drive มา heal
function looksCorrupt(name: string | null): boolean {
  if (!name) return true;
  return /\?{2,}/.test(name);
}

async function resolveFolderName(folderId: string, dbName: string | null, tenantId: string): Promise<string | null> {
  const cached = nameCache.get(folderId);
  if (cached) return cached;
  if (!looksCorrupt(dbName)) {
    nameCache.set(folderId, dbName as string);
    return dbName;
  }
  const live = await getFolderName(folderId);
  if (live) {
    nameCache.set(folderId, live);
    db().prepare(`UPDATE runs SET folder_name=? WHERE tenant_id=? AND folder_id=?`).run(live, tenantId, folderId);
    return live;
  }
  return dbName;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  ensureBooted();
  const r = activeRun(tenantId);
  const folderName = r ? await resolveFolderName(r.folder_id, r.folder_name, tenantId) : null;
  return NextResponse.json({
    run: r
      ? {
          id: r.id,
          folderId: r.folder_id,
          folderName,
          total: r.total_photos,
          processed: r.processed_photos,
          failed: r.failed_photos,
          status: r.status,
          startedAt: r.started_at,
        }
      : null,
    queue: queueStats(),
  });
}
