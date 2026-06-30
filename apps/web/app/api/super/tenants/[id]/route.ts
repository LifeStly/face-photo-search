import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, getSession } from '@/lib/auth';
import { getTenant, updateTenant, deleteTenant, logAudit } from '@/lib/tenant';
import { DEFAULT_TENANT_ID } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const t = getTenant(params.id);
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ tenant: t });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const t = getTenant(params.id);
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({} as any));
  const { name, slug, status, expiresAt } = body ?? {};
  if (status && !['active', 'suspended', 'expired'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }
  updateTenant(params.id, {
    ...(name !== undefined ? { name } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
  });
  const s = await getSession();
  logAudit({
    tenantId: params.id,
    userId: s.userId ?? null,
    action: 'tenant_update',
    target: `tenant:${params.id}`,
    meta: { name, slug, status, expiresAt },
  });
  return NextResponse.json({ ok: true, tenant: getTenant(params.id) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (params.id === DEFAULT_TENANT_ID) {
    return NextResponse.json({ error: 'cannot delete default tenant' }, { status: 400 });
  }
  const t = getTenant(params.id);
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 });
  deleteTenant(params.id);
  const s = await getSession();
  logAudit({
    tenantId: null,
    userId: s.userId ?? null,
    action: 'tenant_delete',
    target: `tenant:${params.id}`,
    meta: { name: t.name, slug: t.slug },
  });
  return NextResponse.json({ ok: true });
}
