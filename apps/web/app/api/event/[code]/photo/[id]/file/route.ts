import { NextRequest, NextResponse } from 'next/server';
import { gateEvent, gateError, photoBelongsToEvent } from '@/lib/event';
import { getPhoto } from '@/lib/db';
import { downloadFile, downloadThumbnail } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { code: string; id: string } }) {
  const g = await gateEvent(params.code);
  if (!g.ok) return gateError(g);

  const id = decodeURIComponent(params.id);
  if (!photoBelongsToEvent(id, g.access.runId)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const p = getPhoto(id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const size = req.nextUrl.searchParams.get('size');
  const forceDownload = req.nextUrl.searchParams.get('dl') === '1';
  try {
    const buf = size === 'thumb'
      ? await downloadThumbnail(p.drive_file_id, 600)
      : await downloadFile(p.drive_file_id);
    const disposition = forceDownload ? 'attachment' : 'inline';
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': p.mime_type ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        ...(size !== 'thumb' && {
          'Content-Disposition': `${disposition}; filename="${encodeURIComponent(p.name)}"`,
        }),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'download failed' }, { status: 500 });
  }
}
