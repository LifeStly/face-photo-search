import { NextRequest, NextResponse } from 'next/server';
import { gateEvent, gateError } from '@/lib/event';
import { allEmbeddings, db } from '@/lib/db';
import { embedImage, deserializeDescriptor } from '@/lib/face';
import { euclidean, distanceToSimilarity } from '@/lib/similarity';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const g = await gateEvent(params.code);
  if (!g.ok) return gateError(g);

  const form = await req.formData();
  const file = form.get('selfie');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'missing selfie' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const detected = await embedImage(buf);
  if (detected.length === 0) {
    return NextResponse.json({ error: 'ไม่พบใบหน้าในรูปที่ส่งมา ลองถ่ายใหม่ให้หน้าตรง', matches: [] }, { status: 200 });
  }

  const target = detected[0].descriptor;
  const rows = allEmbeddings(g.access.runId, g.access.tenantId);

  const byPhoto = new Map<string, number>();
  for (const r of rows) {
    const d = euclidean(target, deserializeDescriptor(r.descriptor));
    const prev = byPhoto.get(r.photo_id);
    if (prev == null || d < prev) byPhoto.set(r.photo_id, d);
  }

  const hits = Array.from(byPhoto.entries())
    .filter(([, d]) => d <= config.face.matchThreshold)
    .map(([photoId, distance]) => ({ photoId, distance }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 60);

  if (hits.length === 0) return NextResponse.json({ matches: [] });

  const ids = hits.map((h) => h.photoId);
  const placeholders = ids.map(() => '?').join(',');
  const photos = db()
    .prepare(`SELECT id, name, thumbnail_url FROM photos WHERE tenant_id=? AND id IN (${placeholders})`)
    .all(g.access.tenantId, ...ids) as Array<{ id: string; name: string; thumbnail_url: string | null }>;
  const meta = new Map(photos.map((p) => [p.id, p]));

  const matches = hits.map((h) => {
    const m = meta.get(h.photoId);
    return {
      photoId: h.photoId,
      similarity: distanceToSimilarity(h.distance),
      name: m?.name ?? '',
      thumbnailUrl: m?.thumbnail_url ?? null,
    };
  });

  return NextResponse.json({ matches });
}
