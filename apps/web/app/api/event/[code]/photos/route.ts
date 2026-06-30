import { NextRequest, NextResponse } from 'next/server';
import { gateEvent, gateError } from '@/lib/event';
import { listPhotos } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const g = await gateEvent(params.code);
  if (!g.ok) return gateError(g);

  const url = req.nextUrl;
  const limit = Number(url.searchParams.get('limit') ?? 60);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const photos = listPhotos({ runId: g.access.runId, limit, offset, includeHidden: false });
  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      name: p.name,
      thumbnailUrl: p.thumbnail_url,
      pinnedAt: p.pinned_at,
      faceCount: p.face_count,
    })),
  });
}
