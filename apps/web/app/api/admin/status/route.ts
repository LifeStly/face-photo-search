import { NextResponse } from 'next/server';
import IORedis from 'ioredis';
import { requireAdmin } from '@/lib/auth';
import { activeRun } from '@/lib/db';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function pingRedis(): Promise<boolean> {
  try {
    const r = new IORedis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await r.connect();
    const pong = await r.ping();
    r.disconnect();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = activeRun();
  const redis = await pingRedis();
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
    system: { redis },
  });
}
