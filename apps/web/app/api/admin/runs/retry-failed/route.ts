import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun, listFailedPhotos } from '@/lib/db';
import { faceProcessQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = activeRun();
  if (!r) return NextResponse.json({ error: 'no active run' }, { status: 400 });

  const failed = listFailedPhotos(r.id);
  if (failed.length === 0) return NextResponse.json({ ok: true, retried: 0 });

  // เคลียร์ flag fail + ลด failed counter ใน runs
  const clear = db().prepare(`UPDATE photos SET failed_at=NULL, fail_reason=NULL WHERE id=?`);
  const decRun = db().prepare(`UPDATE runs SET failed_photos = MAX(0, failed_photos - ?) WHERE id=?`);
  const tx = db().transaction(() => {
    for (const p of failed) clear.run(p.id);
    decRun.run(failed.length, r.id);
  });
  tx();

  const q = faceProcessQueue();
  for (const p of failed) {
    await q.add('embed', { photoId: p.id, driveFileId: p.drive_file_id, runId: r.id }, {
      removeOnComplete: 200, removeOnFail: 200,
      attempts: 2, backoff: { type: 'exponential', delay: 2000 },
    });
  }
  return NextResponse.json({ ok: true, retried: failed.length });
}
