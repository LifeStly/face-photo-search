import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { ZipArchive } from 'archiver';
import { getPhoto } from '@/lib/db';
import { downloadFile } from '@/lib/drive';
import { gateEvent, gateError, photoBelongsToEvent } from '@/lib/event';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function readIds(req: NextRequest): Promise<string[]> {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const body = await req.json();
    return Array.isArray(body?.ids) ? body.ids.map(String) : [];
  }
  const fd = await req.formData();
  return fd.getAll('ids').map((v) => String(v)).filter(Boolean);
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const g = await gateEvent(params.code);
  if (!g.ok) return gateError(g);

  const requested = await readIds(req);
  if (requested.length === 0) return NextResponse.json({ error: 'no ids' }, { status: 400 });

  // scope filter — เก็บเฉพาะ photo id ที่ belong to runId ของ event นี้
  const ids = requested.filter((id) => photoBelongsToEvent(id, g.access.runId));
  if (ids.length === 0) return NextResponse.json({ error: 'no valid photos in scope' }, { status: 400 });

  const archive = new ZipArchive({ zlib: { level: 0 } });

  (async () => {
    const seen = new Set<string>();
    for (const id of ids) {
      const photo = getPhoto(id);
      if (!photo) continue;
      try {
        const buf = await downloadFile(photo.drive_file_id);
        let name = (photo.name ?? `photo-${id}`).replace(/[\/\\]/g, '_');
        if (seen.has(name)) {
          const m = name.match(/^(.*?)(\.[^.]+)?$/);
          const base = m?.[1] ?? name;
          const ext = m?.[2] ?? '';
          let n = 2;
          while (seen.has(`${base}-${n}${ext}`)) n++;
          name = `${base}-${n}${ext}`;
        }
        seen.add(name);
        archive.append(buf, { name });
      } catch {}
    }
    archive.finalize();
  })();

  archive.on('error', (err: Error) => console.error('[event download-zip] archive error', err));

  const webStream = Readable.toWeb(archive) as unknown as ReadableStream;
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="photos-${Date.now()}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
