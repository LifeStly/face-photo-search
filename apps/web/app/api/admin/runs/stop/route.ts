import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun } from '@/lib/db';
import { driveSyncQueue, faceProcessQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = activeRun();
  if (!r) return NextResponse.json({ ok: true, message: 'no active run' });

  const ds = driveSyncQueue();
  const fp = faceProcessQueue();
  // ลบ job ที่ค้างใน queue ของ run ปัจจุบัน
  const states: any[] = ['waiting', 'delayed', 'paused', 'active'];
  for (const q of [ds, fp]) {
    const jobs = await q.getJobs(states);
    for (const j of jobs) {
      if ((j.data as any)?.runId === r.id) await j.remove().catch(() => {});
    }
  }

  db().prepare(`UPDATE runs SET status='stopped', finished_at=? WHERE id=?`).run(Date.now(), r.id);
  return NextResponse.json({ ok: true });
}
