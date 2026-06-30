import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { config } from '@/lib/config';
import { DEFAULT_TENANT_ID } from '@/lib/db';
import { verifyLogin, touchLogin } from '@/lib/users';
import { logAudit } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));

  if (config.app.mode === 'portable') {
    // portable: เทียบ ADMIN_PASSWORD ใน env (setup wizard เขียน)
    const expected = process.env.ADMIN_PASSWORD ?? 'changeme';
    if (!password || password !== expected) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }
    const s = await getSession();
    s.admin = true;
    s.loggedAt = Date.now();
    s.userId = 'portable-admin';
    s.tenantId = DEFAULT_TENANT_ID;
    s.role = 'tenant_admin';
    await s.save();
    return NextResponse.json({ ok: true });
  }

  // saas: เทียบ users table
  if (!username || !password) {
    return NextResponse.json({ error: 'กรอก username และรหัสผ่าน' }, { status: 400 });
  }
  const u = verifyLogin(username, password);
  if (!u) {
    return NextResponse.json({ error: 'username หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }
  touchLogin(u.id);
  const s = await getSession();
  s.admin = true;
  s.loggedAt = Date.now();
  s.userId = u.id;
  s.tenantId = u.tenant_id ?? undefined;
  s.role = u.role;
  await s.save();
  logAudit({ tenantId: u.tenant_id, userId: u.id, action: 'login' });
  return NextResponse.json({ ok: true, role: u.role });
}

export async function DELETE() {
  const s = await getSession();
  await s.destroy();
  return NextResponse.json({ ok: true });
}
