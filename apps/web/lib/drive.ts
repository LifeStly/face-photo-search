import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import { config } from './config';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

let _client: drive_v3.Drive | null = null;

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

export async function listImagesInFolder(folderId: string, pageSize = 1000): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const res: any = await drive().files.list({
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

export async function listFolders(parentId?: string): Promise<DriveFile[]> {
  const q = parentId
    ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive().files.list({
    q,
    fields: 'files(id, name, createdTime, modifiedTime)',
    pageSize: 200,
    orderBy: 'createdTime desc',
  });
  return (res.data.files ?? []) as DriveFile[];
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const res = await drive().files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * Fetch the Drive-rendered thumbnail (much smaller than the original) — used for
 * face embedding so we don't burn bandwidth on full-resolution downloads. Falls
 * back to the full file if the thumbnail endpoint refuses.
 */
export async function downloadThumbnail(fileId: string, size = 1024): Promise<Buffer> {
  const auth = await (drive() as any).context._options.auth.getClient();
  const token = (await auth.getAccessToken()).token;
  const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return downloadFile(fileId);
  const buf = Buffer.from(await res.arrayBuffer());
  // Drive returns a tiny placeholder for files that have no thumbnail yet — fall back
  if (buf.byteLength < 2048) return downloadFile(fileId);
  return buf;
}
