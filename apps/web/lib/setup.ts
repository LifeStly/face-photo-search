import fs from 'fs';
import path from 'path';
import { config } from './config';

export type SetupData = {
  adminPassword: string;
  sessionSecret: string;
  driveFolderId?: string;
  driveFolderName?: string;
  hasServiceAccount: boolean;
};

const configPath = () => path.join(config.paths.projectRoot, 'data', 'config.json');
const serviceAccountPath = () => config.drive.credentialsPath;

export function isSetupComplete(): boolean {
  // saas: เสร็จเมื่อมี super-admin (SA + folder per-tenant ทำหลัง login)
  if (config.app.mode === 'saas') {
    // dynamic require — กัน circular
    const { hasAnySuperAdmin } = require('./users') as typeof import('./users');
    return hasAnySuperAdmin();
  }
  // portable: ต้องมี password + SA file
  const pw = process.env.ADMIN_PASSWORD ?? '';
  if (!pw || pw === 'changeme') return false;
  if (!fs.existsSync(serviceAccountPath())) return false;
  return true;
}

export function readSetup(): SetupData | null {
  const p = configPath();
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      adminPassword: raw.adminPassword ?? '',
      sessionSecret: raw.sessionSecret ?? '',
      driveFolderId: raw.driveFolderId,
      driveFolderName: raw.driveFolderName,
      hasServiceAccount: fs.existsSync(serviceAccountPath()),
    };
  } catch {
    return null;
  }
}

export function writeSetup(data: Partial<SetupData>) {
  const p = configPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = readSetup() ?? { adminPassword: '', sessionSecret: '', hasServiceAccount: false };
  const merged = { ...current, ...data };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
  // ใส่กลับ env เพื่อให้ runtime อ่านได้ทันที (ไม่ต้อง restart)
  if (data.adminPassword) process.env.ADMIN_PASSWORD = data.adminPassword;
  if (data.sessionSecret) process.env.SESSION_SECRET = data.sessionSecret;
  if (data.driveFolderId) process.env.DRIVE_DEFAULT_FOLDER_ID = data.driveFolderId;
}

export function writeServiceAccount(jsonContent: string) {
  const p = serviceAccountPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // validate ว่าเป็น JSON ที่ parse ได้และมี client_email
  const parsed = JSON.parse(jsonContent);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('ไฟล์ไม่ใช่ Google service account key (ต้องมี client_email + private_key)');
  }
  fs.writeFileSync(p, jsonContent, 'utf8');
  return parsed.client_email as string;
}

export function loadSetupIntoEnv() {
  const s = readSetup();
  if (!s) return;
  if (s.adminPassword) process.env.ADMIN_PASSWORD = s.adminPassword;
  if (s.sessionSecret) process.env.SESSION_SECRET = s.sessionSecret;
  if (s.driveFolderId) process.env.DRIVE_DEFAULT_FOLDER_ID = s.driveFolderId;
}
