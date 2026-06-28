import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { activeRun } from '@/lib/db';
import { startDriveSyncNow } from '@/lib/jobs/driveSync';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = activeRun();
  if (!r) return NextResponse.json({ error: 'no active run' }, { status: 400 });

  startDriveSyncNow({ runId: r.id, folderId: r.folder_id, folderName: r.folder_name });
  return NextResponse.json({ ok: true });
}
