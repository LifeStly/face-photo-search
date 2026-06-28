import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun } from '@/lib/db';
import { clearAll } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = activeRun();
  if (!r) return NextResponse.json({ ok: true, message: 'no active run' });

  db().prepare(`UPDATE runs SET status='stopped', finished_at=? WHERE id=?`).run(Date.now(), r.id);
  clearAll();
  return NextResponse.json({ ok: true });
}
