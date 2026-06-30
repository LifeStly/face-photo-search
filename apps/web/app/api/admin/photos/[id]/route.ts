import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, getPhoto } from '@/lib/db';
import { getCurrentTenantId } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const id = decodeURIComponent(params.id);
  const body = await req.json().catch(() => ({} as any));
  const photo = getPhoto(id, tenantId);
  if (!photo) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (typeof body.hidden === 'boolean') {
    db().prepare(`UPDATE photos SET hidden=? WHERE id=? AND tenant_id=?`).run(body.hidden ? 1 : 0, id, tenantId);
  }
  if (typeof body.pinned === 'boolean') {
    db().prepare(`UPDATE photos SET pinned_at=? WHERE id=? AND tenant_id=?`).run(body.pinned ? Date.now() : null, id, tenantId);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: 'no tenant' }, { status: 403 });
  const id = decodeURIComponent(params.id);
  const photo = getPhoto(id, tenantId);
  if (!photo) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const tx = db().transaction(() => {
    db().prepare(`DELETE FROM embeddings WHERE photo_id=? AND tenant_id=?`).run(id, tenantId);
    db().prepare(`DELETE FROM photos WHERE id=? AND tenant_id=?`).run(id, tenantId);
    db().prepare(`UPDATE runs SET total_photos = MAX(0, total_photos - 1) WHERE id=?`).run(photo.run_id);
  });
  tx();
  return NextResponse.json({ ok: true });
}
