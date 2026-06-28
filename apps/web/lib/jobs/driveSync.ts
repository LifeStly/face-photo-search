import { db } from '../db';
import { listImagesInFolder } from '../drive';
import { config } from '../config';
import { scheduleDriveSync, cancelDriveSync } from '../queue';
import { enqueueFaceProcess } from './faceProcess';

type Args = { runId: number; folderId: string; folderName?: string | null };

export async function runDriveSync({ runId, folderId, folderName }: Args) {
  if (!isRunStillActive(runId)) {
    log(`[drive-sync] run=${runId} no longer active, stopping poll`);
    return;
  }

  log(`[drive-sync] run=${runId} folder=${folderId}`);
  const files = await listImagesInFolder(folderId);
  log(`[drive-sync] found ${files.length} images`);

  const insert = db().prepare(`
    INSERT OR IGNORE INTO photos
      (id, run_id, drive_file_id, name, mime_type, width, height,
       thumbnail_url, download_url, view_url, created_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let queued = 0;
  for (const f of files) {
    const id = `${runId}:${f.id}`;
    const r = insert.run(
      id,
      runId,
      f.id,
      f.name,
      f.mimeType,
      f.imageMediaMetadata?.width ?? null,
      f.imageMediaMetadata?.height ?? null,
      f.thumbnailLink ?? null,
      f.webContentLink ?? `https://drive.google.com/uc?export=download&id=${f.id}`,
      f.webViewLink ?? null,
      f.createdTime ? Date.parse(f.createdTime) : null
    );
    if (r.changes > 0) {
      enqueueFaceProcess({ photoId: id, driveFileId: f.id, runId });
      queued++;
    }
  }

  db().prepare(`UPDATE runs SET total_photos = (SELECT COUNT(*) FROM photos WHERE run_id=?) WHERE id=?`).run(runId, runId);
  log(`[drive-sync] queued ${queued} new photos`);

  if (isRunStillActive(runId)) {
    scheduleDriveSync(runId, () => runDriveSync({ runId, folderId, folderName }), config.drive.pollIntervalSec * 1000);
  }
}

export function startDriveSyncNow(args: Args) {
  cancelDriveSync();
  scheduleDriveSync(args.runId, () => runDriveSync(args), 0);
}

function isRunStillActive(runId: number): boolean {
  const row = db().prepare(`SELECT status FROM runs WHERE id=?`).get(runId) as { status: string } | undefined;
  return row?.status === 'running';
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
