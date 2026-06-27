import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';
import { db } from './db';
import { ready as faceReady } from './face';
import { processDriveSync } from './driveSync';
import { processFace } from './faceProcess';

async function main() {
  log('starting worker...');
  db();
  log(`SQLite ready at ${config.sqlite.path}`);
  await faceReady();
  log('face-api models loaded');

  const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });

  const driveSync = new Worker('drive-sync', processDriveSync, {
    connection,
    concurrency: 1,
  });

  const face = new Worker('face-process', async (job) => {
    try {
      await processFace(job as any);
    } catch (e: any) {
      const { runId, photoId } = (job.data as any) ?? {};
      const msg = e?.message ?? String(e);
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        if (runId) db().prepare(`UPDATE runs SET failed_photos = failed_photos + 1 WHERE id=?`).run(runId);
        if (photoId) db().prepare(`UPDATE photos SET failed_at=?, fail_reason=? WHERE id=?`).run(Date.now(), msg, photoId);
      }
      throw e;
    }
  }, {
    connection,
    concurrency: config.worker.concurrency,
  });

  driveSync.on('failed', (job, err) => log(`[drive-sync] FAIL ${job?.id}: ${err?.message}`));
  face.on('failed', (job, err) => log(`[face] FAIL ${job?.id}: ${err?.message}`));

  log(`worker up — face concurrency=${config.worker.concurrency}`);

  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, async () => {
      log(`${sig} received, shutting down...`);
      await driveSync.close();
      await face.close();
      await connection.quit();
      process.exit(0);
    });
  }
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
