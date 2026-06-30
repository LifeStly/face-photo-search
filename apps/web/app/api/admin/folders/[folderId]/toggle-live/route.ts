import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun, removeIgnored } from '@/lib/db';
import { startDriveSyncNow } from '@/lib/jobs/driveSync';
import { clearAll } from '@/lib/queue';
import { ensureEventCodeForFolder } from '@/lib/event';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Toggle Live ↔ Archive ของ folder ที่มี run อยู่แล้ว (มีข้อมูลใน DB)
 * - Live → Archive: หยุด sync, mark status='stopped', mode='archive'
 * - Archive → Live: ต้องไม่มี Live อื่นค้างอยู่; resume run + เริ่ม poll
 */
export async function POST(_req: NextRequest, { params }: { params: { folderId: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const folderId = decodeURIComponent(params.folderId);
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const run = db()
    .prepare(`SELECT id, folder_name, mode, status FROM runs WHERE folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(folderId) as { id: number; folder_name: string | null; mode: string; status: string } | undefined;

  if (!run) {
    return NextResponse.json({ error: 'ยังไม่เคยเริ่มงานกับ folder นี้ — ใช้ /api/admin/start แทน' }, { status: 400 });
  }

  const isCurrentlyLive = run.mode === 'live' && run.status === 'running';

  if (isCurrentlyLive) {
    // Live → Archive: หยุด poll + เปลี่ยน mode
    clearAll();
    db().prepare(`UPDATE runs SET mode='archive', status='completed', finished_at=? WHERE id=?`)
      .run(Date.now(), run.id);
    return NextResponse.json({ ok: true, mode: 'archive' });
  }

  // Archive → Live: เช็คว่ามี Live อื่นมั้ย
  const other = activeRun();
  if (other && other.folder_id !== folderId) {
    return NextResponse.json(
      { error: `มี folder Live อยู่แล้ว ("${other.folder_name ?? other.folder_id}") — ต้องปิด Live ก่อนถึงจะตั้งใหม่ได้` },
      { status: 409 }
    );
  }

  removeIgnored(folderId);
  db().prepare(`UPDATE runs SET mode='live', status='running', finished_at=NULL WHERE id=?`).run(run.id);
  // auto-enable QR (public, no password) ตอนเปลี่ยนเป็น Live
  const qr = ensureEventCodeForFolder(folderId);
  startDriveSyncNow({ runId: run.id, folderId, folderName: run.folder_name });
  return NextResponse.json({ ok: true, mode: 'live', qrCode: qr.code, qrCreated: qr.created });
}
