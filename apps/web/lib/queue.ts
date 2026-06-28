import { config } from './config';

type Task = () => Promise<void>;

class Queue {
  private running = 0;
  private pending: Task[] = [];
  constructor(private concurrency: number) {}

  add(task: Task) {
    this.pending.push(task);
    this.drain();
  }

  size() {
    return this.pending.length + this.running;
  }

  clear() {
    this.pending = [];
  }

  private drain() {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const t = this.pending.shift()!;
      this.running++;
      t().catch((e) => log(`[queue] task error: ${e?.message ?? e}`)).finally(() => {
        this.running--;
        this.drain();
      });
    }
  }
}

export const faceQueue = new Queue(config.face.concurrency);

let _driveTimer: NodeJS.Timeout | null = null;

export function scheduleDriveSync(runId: number, fn: () => Promise<void>, delayMs: number) {
  cancelDriveSync();
  _driveTimer = setTimeout(async () => {
    _driveTimer = null;
    try {
      await fn();
    } catch (e: any) {
      log(`[drive-sync] error run=${runId}: ${e?.message ?? e}`);
    }
  }, delayMs);
}

export function cancelDriveSync() {
  if (_driveTimer) {
    clearTimeout(_driveTimer);
    _driveTimer = null;
  }
}

export function clearAll() {
  cancelDriveSync();
  faceQueue.clear();
}

export function queueStats() {
  return { face: faceQueue.size(), driveSyncScheduled: _driveTimer !== null };
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
