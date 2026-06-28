import { db } from '../db';
import { downloadThumbnail } from '../drive';
import { embedImage, serializeDescriptor } from '../face';
import { faceQueue } from '../queue';

type Args = { photoId: string; driveFileId: string; runId: number };

export function enqueueFaceProcess(args: Args) {
  faceQueue.add(() => runFaceProcess(args));
}

async function runFaceProcess({ photoId, driveFileId, runId }: Args) {
  if (!isRunStillActive(runId)) return;

  const MAX_ATTEMPTS = 2;
  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const buf = await downloadThumbnail(driveFileId, 1024);
      const faces = await embedImage(buf);

      const insertEmb = db().prepare(`
        INSERT INTO embeddings (photo_id, descriptor, box_x, box_y, box_w, box_h)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const tx = db().transaction((items: typeof faces) => {
        for (const f of items) {
          insertEmb.run(
            photoId,
            serializeDescriptor(f.descriptor),
            f.box.x, f.box.y, f.box.width, f.box.height
          );
        }
      });
      tx(faces);

      db().prepare(`UPDATE photos SET face_count=?, processed_at=? WHERE id=?`)
        .run(faces.length, Date.now(), photoId);
      db().prepare(`UPDATE runs SET processed_photos = processed_photos + 1 WHERE id=?`)
        .run(runId);

      log(`[face] ${photoId} → ${faces.length} face(s)`);
      return;
    } catch (e: any) {
      lastErr = e;
      if (attempt < MAX_ATTEMPTS) await sleep(2000 * attempt);
    }
  }

  const msg = lastErr?.message ?? String(lastErr);
  db().prepare(`UPDATE photos SET failed_at=?, fail_reason=? WHERE id=?`)
    .run(Date.now(), msg, photoId);
  db().prepare(`UPDATE runs SET failed_photos = failed_photos + 1 WHERE id=?`)
    .run(runId);
  log(`[face] FAIL ${photoId}: ${msg}`);
}

function isRunStillActive(runId: number): boolean {
  const row = db().prepare(`SELECT status FROM runs WHERE id=?`).get(runId) as { status: string } | undefined;
  return row?.status === 'running';
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
