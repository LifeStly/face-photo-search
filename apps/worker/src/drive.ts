import { google, drive_v3 } from 'googleapis';
import fs from 'node:fs';
import { config } from './config';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

let _client: drive_v3.Drive | null = null;
export function drive(): drive_v3.Drive {
  if (_client) return _client;
  if (!fs.existsSync(config.drive.credentialsPath)) {
    throw new Error(`Service account file not found at ${config.drive.credentialsPath}`);
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
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  imageMediaMetadata?: { width?: number; height?: number };
};

export async function listImages(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const res: any = await drive().files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, thumbnailLink, webViewLink, webContentLink, imageMediaMetadata(width,height))',
      pageSize: 1000,
      pageToken,
      orderBy: 'createdTime desc',
    });
    out.push(...((res.data.files ?? []) as DriveFile[]));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const res = await drive().files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
