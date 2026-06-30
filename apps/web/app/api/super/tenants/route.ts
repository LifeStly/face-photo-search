import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, getSession } from '@/lib/auth';
import { listTenants, createTenant, getTenantBySlug, logAudit, setQuota } from '@/lib/tenant';
import { createUser, findUserByUsername } from '@/lib/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ tenants: listTenants() });
}

/**
 * Create tenant + tenant_admin user คนแรก + quota (optional)
 * body: { name, slug, expiresAt?, adminUsername, adminPassword, quota?:{photo?,search?,storageGB?} }
 */
export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  const { name, slug, expiresAt, adminUsername, adminPassword, quota } = body ?? {};

  if (!name || !slug || !adminUsername || !adminPassword) {
    return NextResponse.json({ error: 'name, slug, adminUsername, adminPassword จำเป็น' }, { status: 400 });
  }
  if (!/^[a-z0-9-]{2,32}$/.test(slug)) {
    return NextResponse.json({ error: 'slug ต้องเป็น a-z, 0-9, dash, ยาว 2-32' }, { status: 400 });
  }
  if (adminPassword.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่าน tenant-admin ขั้นต่ำ 8 ตัว' }, { status: 400 });
  }
  if (getTenantBySlug(slug)) {
    return NextResponse.json({ error: 'slug นี้ถูกใช้แล้ว' }, { status: 409 });
  }
  if (findUserByUsername(adminUsername)) {
    return NextResponse.json({ error: 'username นี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const t = createTenant({ name, slug, expiresAt: expiresAt ?? null });
  const u = createUser({
    username: adminUsername,
    password: adminPassword,
    role: 'tenant_admin',
    tenantId: t.id,
  });
  if (quota) {
    setQuota({
      tenantId: t.id,
      monthlyPhotoLimit: quota.photo ?? null,
      monthlySearchLimit: quota.search ?? null,
      storageByteLimit: quota.storageGB ? Math.round(quota.storageGB * 1024 ** 3) : null,
    });
  }
  const s = await getSession();
  logAudit({
    tenantId: t.id,
    userId: s.userId ?? null,
    action: 'tenant_create',
    target: `tenant:${t.id}`,
    meta: { name, slug, adminUserId: u.id },
  });
  return NextResponse.json({ ok: true, tenant: t, adminUserId: u.id });
}
