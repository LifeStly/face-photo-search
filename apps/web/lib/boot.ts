import { db } from './db';
import { startDriveSyncNow } from './jobs/driveSync';
import { enqueueFaceProcess } from './jobs/faceProcess';

let _booted = false;

export function ensureBooted() {
  if (_booted) return;
  _booted = true;
  const ts = () => new Date().toISOString();

  // 1. Reactivate archive runs ที่ถูก mark completed ทั้งที่มี pending photos
  const stuck = db().prepare(`
    SELECT DISTINCT r.id FROM runs r
    JOIN photos p ON p.run_id = r.id
    WHERE r.mode='archive' AND r.status='completed'
      AND p.processed_at IS NULL AND p.failed_at IS NULL
  `).all() as Array<{ id: number }>;
  for (const s of stuck) {
    db().prepare(`UPDATE runs SET status='running', finished_at=NULL WHERE id=?`).run(s.id);
    console.log(`${ts()} [boot] reactivated archive run ${s.id} (had pending photos)`);
  }

  // 2. Re-enqueue pending photos จากทุก run ที่ status='running' (live + archive)
  const pending = db().prepare(`
    SELECT p.id, p.drive_file_id, p.run_id
    FROM photos p
    JOIN runs r ON r.id = p.run_id
    WHERE r.status='running'
      AND p.processed_at IS NULL AND p.failed_at IS NULL
  `).all() as Array<{ id: string; drive_file_id: string; run_id: number }>;
  if (pending.length > 0) {
    console.log(`${ts()} [boot] re-enqueuing ${pending.length} pending photo(s)`);
    for (const p of pending) {
      enqueueFaceProcess({ photoId: p.id, driveFileId: p.drive_file_id, runId: p.run_id });
    }
  }

  // 3. Resume Live drive sync ของ "ทุก tenant" (saas รองรับหลาย live run พร้อมกัน ข้าม tenant)
  const liveRuns = db().prepare(`
    SELECT id, folder_id, folder_name, tenant_id FROM runs
    WHERE mode='live' AND status='running'
  `).all() as Array<{ id: number; folder_id: string; folder_name: string | null; tenant_id: string }>;
  for (const run of liveRuns) {
    console.log(`${ts()} [boot] resuming live run ${run.id} folder=${run.folder_id} tenant=${run.tenant_id}`);
    startDriveSyncNow({ runId: run.id, folderId: run.folder_id, folderName: run.folder_name });
  }
  if (liveRuns.length === 0 && stuck.length === 0 && pending.length === 0) {
    console.log(`${ts()} [boot] no active run — waiting for admin to start`);
  }
}
