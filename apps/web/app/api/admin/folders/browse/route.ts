import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listFolders } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parent = req.nextUrl.searchParams.get('parent') || undefined;
  try {
    const folders = await listFolders(parent);
    return NextResponse.json({
      parent,
      folders: folders.map((f) => ({ id: f.id, name: f.name })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
