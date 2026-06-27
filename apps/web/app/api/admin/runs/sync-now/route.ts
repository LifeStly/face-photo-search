import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { activeRun } from '@/lib/db';
import { driveSyncQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = activeRun();
  if (!r) return NextResponse.json({ error: 'no active run' }, { status: 400 });

  // ลบ delayed sync ที่รอ poll อยู่ แล้วเพิ่ม sync ใหม่ทันที
  const q = driveSyncQueue();
  const delayed = await q.getJobs(['delayed', 'waiting']);
  for (const j of delayed) {
    if ((j.data as any)?.runId === r.id) await j.remove().catch(() => {});
  }
  await q.add('sync', { runId: r.id, folderId: r.folder_id, folderName: r.folder_name }, {
    removeOnComplete: 100,
    removeOnFail: 100,
  });
  return NextResponse.json({ ok: true });
}
