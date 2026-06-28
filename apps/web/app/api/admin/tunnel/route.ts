import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getTunnelStatus, startTunnel, stopTunnel } from '@/lib/tunnel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(getTunnelStatus());
}

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { url } = await startTunnel(3000);
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  stopTunnel();
  return NextResponse.json({ ok: true });
}
