import { NextRequest, NextResponse } from 'next/server';
import { getEventSession } from '@/lib/auth';
import { getEventCode } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code;
  const ev = getEventCode(code);
  if (!ev) return NextResponse.json({ error: 'invalid code' }, { status: 404 });

  const { password } = await req.json().catch(() => ({}));

  // Public event (no password) — pass through
  if (!ev.password_hash) {
    const s = await getEventSession();
    s.events = { ...(s.events ?? {}), [code]: Date.now() + SESSION_TTL_MS };
    await s.save();
    return NextResponse.json({ ok: true });
  }

  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'password required' }, { status: 400 });
  }
  const ok = bcrypt.compareSync(password, ev.password_hash);
  if (!ok) return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });

  const s = await getEventSession();
  s.events = { ...(s.events ?? {}), [code]: Date.now() + SESSION_TTL_MS };
  await s.save();
  return NextResponse.json({ ok: true });
}
