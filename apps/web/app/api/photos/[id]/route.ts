import { NextRequest, NextResponse } from 'next/server';
import { getPhoto } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const p = getPhoto(params.id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    id: p.id,
    name: p.name,
    width: p.width,
    height: p.height,
    faceCount: p.face_count,
    thumbnailUrl: p.thumbnail_url,
    downloadUrl: p.download_url ?? `https://drive.google.com/uc?export=download&id=${p.drive_file_id}`,
    viewUrl: p.view_url ?? `https://drive.google.com/file/d/${p.drive_file_id}/view`,
  });
}
