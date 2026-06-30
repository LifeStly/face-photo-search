import { NextResponse } from 'next/server';
import fs from 'fs';
import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = config.drive.credentialsPath;
  if (!fs.existsSync(p)) {
    return NextResponse.json({ email: null, error: 'service-account.json not found', path: p });
  }
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return NextResponse.json({ email: j.client_email ?? null, path: p });
  } catch (e: any) {
    return NextResponse.json({ email: null, error: e?.message ?? 'parse failed', path: p }, { status: 500 });
  }
}
