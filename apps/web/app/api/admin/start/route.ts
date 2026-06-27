import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { driveSyncQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { folderId, folderName } = await req.json().catch(() => ({}));
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const now = Date.now();
  db().prepare(`UPDATE runs SET status='completed', finished_at=? WHERE status='running'`).run(now);
  const r = db()
    .prepare(`INSERT INTO runs (folder_id, folder_name, started_at, status) VALUES (?, ?, ?, 'running')`)
    .run(folderId, folderName ?? null, now);
  const runId = Number(r.lastInsertRowid);

  await driveSyncQueue().add(
    'sync',
    { runId, folderId, folderName },
    { removeOnComplete: 100, removeOnFail: 100 }
  );

  return NextResponse.json({ ok: true, runId });
}
