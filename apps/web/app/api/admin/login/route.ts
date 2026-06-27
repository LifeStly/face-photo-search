import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== config.admin.password) {
    return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }
  const s = await getSession();
  s.admin = true;
  s.loggedAt = Date.now();
  await s.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const s = await getSession();
  await s.destroy();
  return NextResponse.json({ ok: true });
}
