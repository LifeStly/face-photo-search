import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun, listFailedPhotos } from '@/lib/db';
import { enqueueFaceProcess } from '@/lib/jobs/faceProcess';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const r = activeRun(tenantId);
  if (!r) return NextResponse.json({ error: 'no active run' }, { status: 400 });

  const failed = listFailedPhotos(r.id, tenantId);
  if (failed.length === 0) return NextResponse.json({ ok: true, retried: 0 });

  const clear = db().prepare(`UPDATE photos SET failed_at=NULL, fail_reason=NULL WHERE id=?`);
  const decRun = db().prepare(`UPDATE runs SET failed_photos = MAX(0, failed_photos - ?) WHERE id=?`);
  const tx = db().transaction(() => {
    for (const p of failed) clear.run(p.id);
    decRun.run(failed.length, r.id);
  });
  tx();

  for (const p of failed) {
    enqueueFaceProcess({ photoId: p.id, driveFileId: p.drive_file_id, runId: r.id });
  }
  return NextResponse.json({ ok: true, retried: failed.length });
}
