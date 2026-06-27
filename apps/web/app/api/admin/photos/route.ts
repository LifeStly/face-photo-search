import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listPhotos } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get('limit') || '120', 10), 500);
  const offset = parseInt(sp.get('offset') || '0', 10);
  const photos = listPhotos({ limit, offset, includeHidden: true });
  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      name: p.name,
      thumbnailUrl: p.thumbnail_url,
      faceCount: p.face_count,
      hidden: !!p.hidden,
      pinned: !!p.pinned_at,
      failed: !!p.failed_at,
      failReason: p.fail_reason,
    })),
  });
}
