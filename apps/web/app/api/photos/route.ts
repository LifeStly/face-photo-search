import { NextRequest, NextResponse } from 'next/server';
import { listPhotos } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get('limit') || '60', 10), 200);
  const offset = parseInt(sp.get('offset') || '0', 10);
  const photos = listPhotos({ limit, offset });
  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      name: p.name,
      thumbnailUrl: p.thumbnail_url,
      faceCount: p.face_count,
      createdTime: p.created_time,
    })),
  });
}
