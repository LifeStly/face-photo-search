import type { Job } from 'bullmq';
import { db } from './db';
import { downloadFile } from './drive';
import { embedImage, serializeDescriptor } from './face';

type FaceJob = { photoId: string; driveFileId: string; runId: number };

export async function processFace(job: Job<FaceJob>) {
  const { photoId, driveFileId, runId } = job.data;
  const buf = await downloadFile(driveFileId);
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

  db()
    .prepare(`UPDATE photos SET face_count=?, processed_at=? WHERE id=?`)
    .run(faces.length, Date.now(), photoId);
  db()
    .prepare(`UPDATE runs SET processed_photos = processed_photos + 1 WHERE id=?`)
    .run(runId);

  log(`[face] ${photoId} → ${faces.length} face(s)`);
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
