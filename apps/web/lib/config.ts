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
    defaultFolderId: env('DRIVE_DEFAULT_FOLDER_ID', ''),
    pollIntervalSec: num('DRIVE_POLL_INTERVAL_SEC', 20),
  },
  admin: {
    password: env('ADMIN_PASSWORD', 'changeme'),
    sessionSecret: env('SESSION_SECRET', 'please-change-this-to-a-long-random-string-32+'),
  },
  redis: {
    url: env('REDIS_URL', 'redis://redis:6379'),
  },
  sqlite: {
    path: env('SQLITE_PATH', ':memory:'),
  },
  face: {
    modelsPath: env('FACE_MODELS_PATH', '/app/models'),
    resizeWidth: num('FACE_RESIZE_WIDTH', 800),
    matchThreshold: num('FACE_MATCH_THRESHOLD', 0.5),
  },
  app: {
    name: env('NEXT_PUBLIC_APP_NAME', 'Face Photo Search'),
  },
} as const;
