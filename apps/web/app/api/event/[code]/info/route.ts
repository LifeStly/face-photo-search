import { NextRequest, NextResponse } from 'next/server';
import { getEventCode, db } from '@/lib/db';
import { isEventAuthed } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public endpoint — แสดงข้อมูล event ก่อน login (ชื่อ folder + ต้องใส่รหัสมั้ย)
 * ไม่ต้องผ่าน gate เพราะหน้า /event/[code] ต้องใช้ตัดสินว่าจะแสดง form password หรือเด้งเข้าเลย
 */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const ev = getEventCode(params.code);
  if (!ev) return NextResponse.json({ error: 'invalid code' }, { status: 404 });

  const row = db()
    .prepare(`SELECT folder_name FROM runs WHERE tenant_id=? AND folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(ev.tenant_id, ev.folder_id) as { folder_name: string | null } | undefined;

  const authed = await isEventAuthed(params.code);

  return NextResponse.json({
    code: params.code,
    folderName: row?.folder_name ?? '(ไม่ทราบชื่อ)',
    hasPassword: !!ev.password_hash,
    authed,
  });
}
