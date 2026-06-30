import { db } from '../db';
import { listImagesInFolder } from '../drive';
import { config } from '../config';
import { scheduleDriveSync, cancelDriveSync } from '../queue';
import { enqueueFaceProcess } from './faceProcess';

type Args = { runId: number; folderId: string; folderName?: string | null };

export async function runDriveSync({ runId, folderId, folderName }: Args) {
  const runInfo = getRunInfo(runId);
  if (!runInfo || runInfo.status !== 'running') {
    log(`[drive-sync] run=${runId} no longer active, stopping poll`);
    return;
  }

  log(`[drive-sync] run=${runId} mode=${runInfo.mode} folder=${folderId} tenant=${runInfo.tenant_id}`);
  const files = await listImagesInFolder(folderId, runInfo.tenant_id);
  log(`[drive-sync] found ${files.length} images`);

  const insert = db().prepare(`
    INSERT OR IGNORE INTO photos
      (id, run_id, drive_file_id, name, mime_type, width, height,
       thumbnail_url, download_url, view_url, created_time, tenant_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      f.createdTime ? Date.parse(f.createdTime) : null,
      runInfo.tenant_id
    );
    if (r.changes > 0) {
      enqueueFaceProcess({ photoId: id, driveFileId: f.id, runId });
      queued++;
    }
  }

  db().prepare(`UPDATE runs SET total_photos = (SELECT COUNT(*) FROM photos WHERE run_id=?) WHERE id=?`).run(runId, runId);
  log(`[drive-sync] queued ${queued} new photos`);

  // Archive: sync รอบเดียวแล้วจบ — แต่ต้องรอ face queue drain ก่อน mark completed
  //   (faceProcess.ts จะ mark completed เมื่อ pending == 0)
  // Live: reschedule poll ต่อ
  const after = getRunInfo(runId);
  if (after?.status === 'running' && after.mode === 'live') {
    scheduleDriveSync(runId, () => runDriveSync({ runId, folderId, folderName }), config.drive.pollIntervalSec * 1000);
  } else if (after?.status === 'running' && after.mode === 'archive') {
    const pending = (db().prepare(`SELECT COUNT(*) as n FROM photos WHERE run_id=? AND processed_at IS NULL AND failed_at IS NULL`).get(runId) as { n: number }).n;
    if (pending === 0) {
      db().prepare(`UPDATE runs SET status='completed', finished_at=? WHERE id=?`).run(Date.now(), runId);
      log(`[drive-sync] archive run=${runId} sync done, 0 pending, marked completed`);
    } else {
      log(`[drive-sync] archive run=${runId} sync done, ${pending} pending — waiting for face queue`);
    }
  }
}

export function startDriveSyncNow(args: Args) {
  cancelDriveSync();
  scheduleDriveSync(args.runId, () => runDriveSync(args), 0);
}

function getRunInfo(runId: number): { status: string; mode: string; tenant_id: string } | undefined {
  return db().prepare(`SELECT status, mode, tenant_id FROM runs WHERE id=?`).get(runId) as { status: string; mode: string; tenant_id: string } | undefined;
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
