import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';

let _redis: IORedis | null = null;
function redis() {
  if (_redis) return _redis;
  _redis = new IORedis(config.redis.url, { maxRetriesPerRequest: null });
  return _redis;
}

let _driveSync: Queue | null = null;
export function driveSyncQueue(): Queue {
  if (_driveSync) return _driveSync;
  _driveSync = new Queue('drive-sync', { connection: redis() });
  return _driveSync;
}

let _faceProcess: Queue | null = null;
export function faceProcessQueue(): Queue {
  if (_faceProcess) return _faceProcess;
  _faceProcess = new Queue('face-process', { connection: redis() });
  return _faceProcess;
}
