import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import { config } from './config';
import { getDriveSourceForTenant } from './tenant';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

let _client: drive_v3.Drive | null = null;
const _tenantClients = new Map<string, drive_v3.Drive>();

export function drive(): drive_v3.Drive {
  if (_client) return _client;
  if (!fs.existsSync(config.drive.credentialsPath)) {
    throw new Error(
      `Service account file not found at ${config.drive.credentialsPath}. ` +
      `Copy it to /secrets/service-account.json or set GOOGLE_APPLICATION_CREDENTIALS`
    );
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: config.drive.credentialsPath,
    scopes: SCOPES,
  });
  _client = google.drive({ version: 'v3', auth });
  return _client;
}

/**
 * Per-tenant Drive client — saas mode ใช้ตัวนี้
 * portable mode (หรือ tenantId=undefined): fallback drive() global
 * cache ต่อ tenant; ใช้ resetTenantDriveClient(tenantId) clear ตอนเปลี่ยน source
 */
export function driveFor(tenantId: string | undefined): drive_v3.Drive {
  if (!tenantId || config.app.mode !== 'saas') return drive();
  const cached = _tenantClients.get(tenantId);
  if (cached) return cached;
  const src = getDriveSourceForTenant(tenantId);
  if (!src) {
    // ยังไม่ตั้ง source ของ tenant — fallback global SA (กัน crash; admin ต้องตั้งใน UI)
    return drive();
  }
  if (src.type === 'sa') {
    if (!src.sa_file_path || !fs.existsSync(src.sa_file_path)) {
      throw new Error(`tenant ${tenantId} SA file missing at ${src.sa_file_path}`);
    }
    const auth = new google.auth.GoogleAuth({ keyFile: src.sa_file_path, scopes: SCOPES });
    const client = google.drive({ version: 'v3', auth });
    _tenantClients.set(tenantId, client);
    return client;
  }
  if (src.type === 'oauth') {
    if (!src.oauth_tokens_json) {
      throw new Error(`tenant ${tenantId} OAuth tokens missing`);
    }
    const tokens = JSON.parse(src.oauth_tokens_json);
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );
    oauth2.setCredentials(tokens);
    const client = google.drive({ version: 'v3', auth: oauth2 });
    _tenantClients.set(tenantId, client);
    return client;
  }
  throw new Error(`unknown drive source type: ${(src as any).type}`);
}

export function resetTenantDriveClient(tenantId: string) {
  _tenantClients.delete(tenantId);
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  imageMediaMetadata?: { width?: number; height?: number };
};

export async function listImagesInFolder(folderId: string, tenantId?: string, pageSize = 1000): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const res: any = await driveFor(tenantId).files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, thumbnailLink, webViewLink, webContentLink, imageMediaMetadata(width,height))',
      pageSize,
      pageToken,
      orderBy: 'createdTime desc',
    });
    out.push(...((res.data.files ?? []) as DriveFile[]));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

export async function listFolders(parentId?: string, tenantId?: string): Promise<DriveFile[]> {
  const q = parentId
    ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await driveFor(tenantId).files.list({
    q,
    fields: 'files(id, name, createdTime, modifiedTime)',
    pageSize: 200,
    orderBy: 'createdTime desc',
  });
  return (res.data.files ?? []) as DriveFile[];
}

let _saEmail: string | null = null;

/**
 * Clear cached Drive client + SA email หลัง user upload `.json` ใหม่
 * — เรียก lazy: ครั้งหน้าที่ใช้ Drive จะอ่านไฟล์ใหม่จาก credentialsPath
 */
export function resetDriveClient() {
  _client = null;
  _saEmail = null;
}

/**
 * Resolve a folder's current name from Drive by ID.
 * Returns null if the file isn't accessible (no share, deleted) so callers can
 * fall back to whatever was stored locally.
 */
export async function getFolderName(folderId: string, tenantId?: string): Promise<string | null> {
  try {
    const res: any = await driveFor(tenantId).files.get({
      fileId: folderId,
      fields: 'name',
      supportsAllDrives: true,
    } as any);
    return (res.data?.name as string) ?? null;
  } catch {
    return null;
  }
}

export async function downloadFile(fileId: string, tenantId?: string): Promise<Buffer> {
  const res = await driveFor(tenantId).files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function downloadThumbnail(fileId: string, size = 1024, tenantId?: string): Promise<Buffer> {
  const client = driveFor(tenantId);
  const auth = await (client as any).context._options.auth.getClient();
  const token = (await auth.getAccessToken()).token;
  const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return downloadFile(fileId, tenantId);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 2048) return downloadFile(fileId, tenantId);
  return buf;
}
