import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun } from '@/lib/db';
import { clearAll } from '@/lib/queue';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const r = activeRun(tenantId);
  if (!r) return NextResponse.json({ ok: true, message: 'no active run' });

  db().prepare(`UPDATE runs SET status='stopped', finished_at=? WHERE id=?`).run(Date.now(), r.id);
  clearAll();
  return NextResponse.json({ ok: true });
}
