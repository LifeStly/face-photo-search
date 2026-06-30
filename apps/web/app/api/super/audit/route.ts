import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { listAuditLog } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const u = new URL(req.url);
  const tenantId = u.searchParams.get('tenantId') ?? undefined;
  const limit = Number(u.searchParams.get('limit') ?? 100);
  const offset = Number(u.searchParams.get('offset') ?? 0);
  return NextResponse.json({ entries: listAuditLog({ tenantId, limit, offset }) });
}
