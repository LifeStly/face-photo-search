import type { Job } from 'bullmq';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { db } from './db';
import { listImages } from './drive';
import { config } from './config';

type DriveSyncJob = { runId: number; folderId: string; folderName?: string };

let _connection: IORedis | null = null;
function conn() {
  if (_connection) return _connection;
  _connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });
  return _connection;
}

let _faceQueue: Queue | null = null;
function faceQueue() {
  if (_faceQueue) return _faceQueue;
  _faceQueue = new Queue('face-process', { connection: conn() });
  return _faceQueue;
}

export async function processDriveSync(job: Job<DriveSyncJob>) {
  const { runId, folderId } = job.data;
  log(`[drive-sync] run=${runId} folder=${folderId}`);
  const files = await listImages(folderId);
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
      await faceQueue().add(
        'embed',
        { photoId: id, driveFileId: f.id, runId },
        { removeOnComplete: 200, removeOnFail: 200, attempts: 2, backoff: { type: 'exponential', delay: 2000 } }
      );
      queued++;
    }
  }

  db().prepare(`UPDATE runs SET total_photos = (SELECT COUNT(*) FROM photos WHERE run_id=?) WHERE id=?`).run(runId, runId);
  log(`[drive-sync] queued ${queued} new photos, total in DB ${files.length}`);

  // re-schedule poll
  const next = config.drive.pollIntervalSec * 1000;
  await job.queue.add('sync', job.data, { delay: next, removeOnComplete: 100, removeOnFail: 100 });
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
