import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { hasAnySuperAdmin, createUser, findUserByUsername } from '@/lib/users';
import { writeSetup, readSetup } from '@/lib/setup';
import { logAudit } from '@/lib/tenant';

export const runtime = 'nodejs';

/**
 * Bootstrap super-admin คนแรกใน saas mode
 * - allowed เฉพาะเมื่อยังไม่มี super-admin คนใดในระบบ (one-time bootstrap)
 * - หลังจากนั้น super-admin ที่มีอยู่จะสร้างเพิ่มได้ผ่าน /api/super/users (Phase B.2)
 * - generate SESSION_SECRET ถ้ายังไม่มี (เหมือน /api/setup/save)
 */
export async function POST(req: NextRequest) {
  if (config.app.mode !== 'saas') {
    return NextResponse.json({ error: 'available in saas mode only' }, { status: 400 });
  }
  if (hasAnySuperAdmin()) {
    return NextResponse.json({ error: 'super-admin already exists' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({} as any));
  const { username, password } = body ?? {};
  if (!username || typeof username !== 'string' || username.length < 3) {
    return NextResponse.json({ error: 'username ขั้นต่ำ 3 ตัวอักษร' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านขั้นต่ำ 8 ตัวอักษร' }, { status: 400 });
  }
  if (findUserByUsername(username)) {
    return NextResponse.json({ error: 'username นี้ถูกใช้แล้ว' }, { status: 409 });
  }

  // รับรอง SESSION_SECRET — กัน iron-session error ตอน login
  const current = readSetup();
  const sessionSecret = current?.sessionSecret || crypto.randomBytes(32).toString('hex');
  if (!current?.sessionSecret) {
    writeSetup({ sessionSecret });
  }

  const u = createUser({ username, password, role: 'super', tenantId: null });
  logAudit({ userId: u.id, action: 'super_admin_bootstrap', target: `user:${u.id}` });
  return NextResponse.json({ ok: true, userId: u.id });
}
