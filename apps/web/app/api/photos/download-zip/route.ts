import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { ZipArchive } from 'archiver';
import { getPhoto } from '@/lib/db';
import { downloadFile } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for big bundles

async function readIds(req: NextRequest): Promise<string[]> {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const body = await req.json();
    return Array.isArray(body?.ids) ? body.ids.map(String) : [];
  }
  // form POST (used by hidden-form fallback)
  const fd = await req.formData();
  const raw = fd.getAll('ids');
  return raw.map((v) => String(v)).filter(Boolean);
}

export async function POST(req: NextRequest) {
  const ids = await readIds(req);
  if (ids.length === 0) {
    return NextResponse.json({ error: 'no ids' }, { status: 400 });
  }

  // images don't compress meaningfully → store-only (level 0) is much faster
  const archive = new ZipArchive({ zlib: { level: 0 } });

  // pump files into the archive in the background; the web response streams as bytes arrive
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
      } catch (e) {
        // skip files that fail — keep the rest of the zip going
      }
    }
    archive.finalize();
  })();

  archive.on('error', (err: Error) => {
    console.error('[download-zip] archive error', err);
  });

  // Node Readable → Web ReadableStream (Next.js 14 / Node 18+)
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
