import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { getTenant, getUsage } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!getTenant(params.id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const u = new URL(req.url);
  const period = u.searchParams.get('period');
  return NextResponse.json({
    usage: getUsage(params.id, period ? Number(period) : undefined),
  });
}
