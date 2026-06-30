import os from 'os';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// หา project root: เดินขึ้นจาก cwd จนเจอ package.json ที่มี "workspaces"
function findProjectRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const j = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (j.workspaces) return dir;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

const projectRoot = findProjectRoot(process.cwd());

// โหลด .env จาก project root (Next.js default โหลดเฉพาะ apps/web/.env)
const rootEnvPath = path.join(projectRoot, '.env');
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath, quiet: true } as any);

// โหลด data/config.json (จาก Setup Wizard) ทับ env values
const setupConfigPath = path.join(projectRoot, 'data', 'config.json');
if (fs.existsSync(setupConfigPath)) {
  try {
    const setup = JSON.parse(fs.readFileSync(setupConfigPath, 'utf8'));
    if (setup.adminPassword) process.env.ADMIN_PASSWORD = setup.adminPassword;
    if (setup.sessionSecret) process.env.SESSION_SECRET = setup.sessionSecret;
    if (setup.driveFolderId) process.env.DRIVE_DEFAULT_FOLDER_ID = setup.driveFolderId;
  } catch {}
}

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

function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(projectRoot, p);
}

const dataDir = resolvePath(env('DATA_DIR', './apps/web/data'));
const modelsDir = resolvePath(env('FACE_MODELS_PATH', './models'));
const secretsDir = resolvePath(env('SECRETS_DIR', './secrets'));
const credPath = resolvePath(env('GOOGLE_APPLICATION_CREDENTIALS', './secrets/service-account.json'));

export const config = {
  paths: {
    projectRoot,
    dataDir,
    secretsDir,
  },
  drive: {
    credentialsPath: credPath,
    defaultFolderId: env('DRIVE_DEFAULT_FOLDER_ID', ''),
    pollIntervalSec: num('DRIVE_POLL_INTERVAL_SEC', 20),
  },
  admin: {
    password: env('ADMIN_PASSWORD', 'changeme'),
    sessionSecret: env('SESSION_SECRET', 'please-change-this-to-a-long-random-string-32+'),
  },
  sqlite: {
    path: resolvePath(env('SQLITE_PATH', path.join(dataDir, 'db.sqlite'))),
  },
  face: {
    modelsPath: modelsDir,
    resizeWidth: num('FACE_RESIZE_WIDTH', 800),
    matchThreshold: num('FACE_MATCH_THRESHOLD', 0.6),
    concurrency: num('FACE_CONCURRENCY', Math.max(1, Math.min(4, os.cpus().length - 1))),
  },
  app: {
    name: env('NEXT_PUBLIC_APP_NAME', 'Face Photo Search'),
    mode: ((): 'portable' | 'saas' => {
      const m = (process.env.APP_MODE ?? 'portable').toLowerCase();
      if (m !== 'portable' && m !== 'saas') {
        throw new Error(`Invalid APP_MODE: ${m} (expected 'portable' or 'saas')`);
      }
      return m;
    })(),
  },
} as const;
