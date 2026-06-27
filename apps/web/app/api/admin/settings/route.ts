import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSettings, setSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getSettings());
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));

  // sanitize brandColor (#hex only)
  if (body.brandColor && !/^#[0-9a-fA-F]{6}$/.test(body.brandColor)) {
    return NextResponse.json({ error: 'brandColor must be #RRGGBB' }, { status: 400 });
  }
  setSettings(body);
  return NextResponse.json(getSettings());
}
