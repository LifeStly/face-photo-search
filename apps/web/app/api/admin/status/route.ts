import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { activeRun } from '@/lib/db';
import { queueStats } from '@/lib/queue';
import { ensureBooted } from '@/lib/boot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  ensureBooted();
  const r = activeRun();
  return NextResponse.json({
    run: r
      ? {
          id: r.id,
          folderId: r.folder_id,
          folderName: r.folder_name,
          total: r.total_photos,
          processed: r.processed_photos,
          failed: r.failed_photos,
          status: r.status,
          startedAt: r.started_at,
        }
      : null,
    queue: queueStats(),
  });
}
