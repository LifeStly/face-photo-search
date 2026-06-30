import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, getSession } from '@/lib/auth';
import { getQuota, setQuota, getTenant, logAudit } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!getTenant(params.id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ quota: getQuota(params.id) ?? null });
}

/** body: { monthlyPhotoLimit?:number|null, monthlySearchLimit?:number|null, storageByteLimit?:number|null } */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!getTenant(params.id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({} as any));
  const { monthlyPhotoLimit, monthlySearchLimit, storageByteLimit } = body ?? {};
  setQuota({
    tenantId: params.id,
    monthlyPhotoLimit: monthlyPhotoLimit ?? null,
    monthlySearchLimit: monthlySearchLimit ?? null,
    storageByteLimit: storageByteLimit ?? null,
  });
  const s = await getSession();
  logAudit({
    tenantId: params.id,
    userId: s.userId ?? null,
    action: 'quota_update',
    target: `tenant:${params.id}`,
    meta: { monthlyPhotoLimit, monthlySearchLimit, storageByteLimit },
  });
  return NextResponse.json({ ok: true, quota: getQuota(params.id) });
}
