import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, latestRunForFolder } from '@/lib/db';
import { enqueueFaceProcess } from '@/lib/jobs/faceProcess';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const folderId: string | undefined = body?.folderId;
  if (!folderId) return NextResponse.json({ error: 'missing folderId' }, { status: 400 });

  const run = latestRunForFolder(folderId, tenantId);
  if (!run) return NextResponse.json({ error: 'no run for folder' }, { status: 404 });

  const photos = db()
    .prepare(`SELECT id, drive_file_id FROM photos WHERE run_id=?`)
    .all(run.id) as Array<{ id: string; drive_file_id: string }>;

  const tx = db().transaction(() => {
    db().prepare(`DELETE FROM embeddings WHERE photo_id IN (SELECT id FROM photos WHERE run_id=?)`).run(run.id);
    db().prepare(`UPDATE photos SET processed_at=NULL, failed_at=NULL, fail_reason=NULL, face_count=0 WHERE run_id=?`).run(run.id);
    db().prepare(`UPDATE runs SET processed_photos=0, failed_photos=0, status='running', finished_at=NULL WHERE id=?`).run(run.id);
  });
  tx();

  for (const p of photos) {
    enqueueFaceProcess({ photoId: p.id, driveFileId: p.drive_file_id, runId: run.id });
  }

  return NextResponse.json({ ok: true, runId: run.id, requeued: photos.length });
}
