import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { writeSetup, readSetup } from '@/lib/setup';

export const runtime = 'nodejs';

function isStrongEnough(pw: string) {
  return typeof pw === 'string' && pw.length >= 4 && pw !== 'changeme';
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const { adminPassword, driveFolderId, driveFolderName } = body ?? {};

  if (adminPassword != null && !isStrongEnough(adminPassword)) {
    return NextResponse.json({ error: 'รหัสผ่านสั้นเกินไป (ขั้นต่ำ 4 ตัวอักษร และห้ามใช้ "changeme")' }, { status: 400 });
  }

  const current = readSetup();
  const sessionSecret = current?.sessionSecret || crypto.randomBytes(32).toString('hex');

  writeSetup({
    ...(adminPassword ? { adminPassword } : {}),
    sessionSecret,
    ...(driveFolderId ? { driveFolderId } : {}),
    ...(driveFolderName != null ? { driveFolderName } : {}),
  });

  return NextResponse.json({ ok: true });
}
