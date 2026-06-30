import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { activeRun } from '@/lib/db';
import { startDriveSyncNow } from '@/lib/jobs/driveSync';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const r = activeRun(tenantId);
  if (!r) return NextResponse.json({ error: 'no active run' }, { status: 400 });

  startDriveSyncNow({ runId: r.id, folderId: r.folder_id, folderName: r.folder_name });
  return NextResponse.json({ ok: true });
}
