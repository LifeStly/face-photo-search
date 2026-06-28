import { activeRun } from './db';
import { startDriveSyncNow } from './jobs/driveSync';

let _booted = false;

export function ensureBooted() {
  if (_booted) return;
  _booted = true;
  const run = activeRun();
  if (run) {
    console.log(`${new Date().toISOString()} [boot] resuming active run ${run.id} folder=${run.folder_id}`);
    startDriveSyncNow({ runId: run.id, folderId: run.folder_id, folderName: run.folder_name });
  } else {
    console.log(`${new Date().toISOString()} [boot] no active run — waiting for admin to start`);
  }
}
