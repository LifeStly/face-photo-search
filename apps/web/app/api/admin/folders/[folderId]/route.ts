import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, dropFolderData, addIgnored } from '@/lib/db';
import { getFolderName } from '@/lib/drive';
import fs from 'fs';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ลบ folder ออกจากระบบ (drop ทุกอย่างใน DB + ใส่ blocklist)
 * - ถ้าเป็น Live → ปฏิเสธ (ต้องปิด Live ก่อน)
 * - หลังลบ: ส่ง email ของ SA กลับไป + ชื่อ folder เพื่อให้ user ไป unshare เอง
 */
export async function DELETE(_req: NextRequest, { params }: { params: { folderId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const folderId = decodeURIComponent(params.folderId);
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const live = db()
    .prepare(`SELECT 1 FROM runs WHERE folder_id=? AND mode='live' AND status='running' LIMIT 1`)
    .get(folderId);
  if (live) {
    return NextResponse.json(
      { error: 'ปิด Live ของ folder นี้ก่อนถึงจะลบได้' },
      { status: 400 }
    );
  }

  // ดึงชื่อ folder ก่อนลบ (เผื่อยังเข้าถึงได้)
  const driveName = await getFolderName(folderId).catch(() => null);
  const dbName = (db().prepare(`SELECT folder_name FROM runs WHERE folder_id=? ORDER BY started_at DESC LIMIT 1`).get(folderId) as { folder_name: string | null } | undefined)?.folder_name;
  const folderName = driveName ?? dbName ?? '(ไม่ทราบชื่อ)';

  const stats = dropFolderData(folderId);
  addIgnored(folderId);

  // ดึง SA email สำหรับ popup unshare guidance
  let saEmail: string | null = null;
  try {
    const txt = fs.readFileSync(config.drive.credentialsPath, 'utf8');
    saEmail = String(JSON.parse(txt).client_email ?? '');
  } catch {}

  return NextResponse.json({
    ok: true,
    folderName,
    saEmail,
    deleted: stats,
  });
}
