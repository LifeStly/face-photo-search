import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db, activeRun, removeIgnored } from '@/lib/db';
import { startDriveSyncNow } from '@/lib/jobs/driveSync';
import { clearAll } from '@/lib/queue';
import { getFolderName } from '@/lib/drive';
import { ensureEventCodeForFolder } from '@/lib/event';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { folderId, folderName: clientName, mode: rawMode } = await req.json().catch(() => ({}));
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const mode: 'live' | 'archive' = rawMode === 'archive' ? 'archive' : 'live';

  // Live ได้ทีละ 1 — ถ้าจะ start เป็น Live ต้องไม่มี Live อื่นค้าง
  if (mode === 'live') {
    const current = activeRun();
    if (current && current.folder_id !== folderId) {
      return NextResponse.json(
        { error: `มี folder Live อยู่แล้ว ("${current.folder_name ?? current.folder_id}") — ต้องปิด Live ก่อนถึงจะตั้งใหม่ได้` },
        { status: 409 }
      );
    }
  }

  // ดึงชื่อจาก Drive โดยตรง — เชื่อถือได้กว่าค่าที่ client ส่งมา (กัน encoding เพี้ยน)
  const liveName = await getFolderName(folderId);
  const folderName = liveName ?? clientName ?? null;

  const now = Date.now();
  // ถ้า user เคยลบ folder นี้ → ปลด ignored เพราะกำลังเริ่มใหม่
  removeIgnored(folderId);

  if (mode === 'live') clearAll();

  // ถ้ามี run ของ folder นี้อยู่แล้ว และเป็น mode=archive ที่ idle → reuse (เปลี่ยน mode/status)
  // ถ้าไม่มี → สร้าง run ใหม่
  const existing = db()
    .prepare(`SELECT id FROM runs WHERE folder_id=? ORDER BY started_at DESC LIMIT 1`)
    .get(folderId) as { id: number } | undefined;

  let runId: number;
  if (existing) {
    db()
      .prepare(`UPDATE runs SET mode=?, status=?, folder_name=?, finished_at=NULL WHERE id=?`)
      .run(mode, mode === 'live' ? 'running' : 'running', folderName, existing.id);
    runId = existing.id;
  } else {
    const r = db()
      .prepare(`INSERT INTO runs (folder_id, folder_name, started_at, status, mode) VALUES (?, ?, ?, ?, ?)`)
      .run(folderId, folderName, now, 'running', mode);
    runId = Number(r.lastInsertRowid);
  }

  // Live: auto-enable QR ให้ทันที (public, no password) — admin ไม่ต้องไปกดเปิดเอง
  let autoQR: { code: string; created: boolean } | null = null;
  if (mode === 'live') {
    autoQR = ensureEventCodeForFolder(folderId);
    startDriveSyncNow({ runId, folderId, folderName });
  } else {
    // Archive: sync 1 รอบแล้วหยุด — driveSync จะเช็ค status='running' เพื่อ reschedule
    // ถ้าอยาก one-shot ต้องเปลี่ยน status เป็น 'completed' หลัง sync รอบแรกเสร็จ
    // ปัจจุบัน leave it running จน sync จบ → driveSync จะ reschedule ต่อเอง — เพื่อ keep มันง่าย
    // (Archive folder = sync ไม่ active แต่ก็ refresh ได้)
    // For now: start sync 1 ครั้ง แล้ว manually mark archive จบใน toggle endpoint
    startDriveSyncNow({ runId, folderId, folderName });
  }
  return NextResponse.json({ ok: true, runId, mode, qrCode: autoQR?.code, qrCreated: autoQR?.created ?? false });
}
