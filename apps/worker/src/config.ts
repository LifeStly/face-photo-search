function env(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v == null || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing env: ${key}`);
  }
  return v;
}
function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number for env ${key}: ${v}`);
  return n;
}

export const config = {
  drive: {
    credentialsPath: env('GOOGLE_APPLICATION_CREDENTIALS', '/secrets/service-account.json'),
    pollIntervalSec: num('DRIVE_POLL_INTERVAL_SEC', 20),
  },
  redis: {
    url: env('REDIS_URL', 'redis://redis:6379'),
  },
  sqlite: {
    path: env('SQLITE_PATH', '/data/db.sqlite'),
  },
  face: {
    modelsPath: env('FACE_MODELS_PATH', '/app/models'),
    resizeWidth: num('FACE_RESIZE_WIDTH', 800),
  },
  worker: {
    concurrency: num('WORKER_CONCURRENCY', 2),
  },
} as const;
