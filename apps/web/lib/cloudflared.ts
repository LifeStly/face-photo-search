import fs from 'fs';
import path from 'path';
import https from 'https';
import { URL } from 'url';
import { spawnSync } from 'child_process';
import { config } from './config';

function platformBinary(): { url: string; filename: string } {
  const plat = process.platform;
  const arch = process.arch;
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download';
  if (plat === 'win32') {
    const f = arch === 'arm64' ? 'cloudflared-windows-arm64.exe' : 'cloudflared-windows-amd64.exe';
    return { url: `${base}/${f}`, filename: 'cloudflared.exe' };
  }
  if (plat === 'darwin') {
    return { url: `${base}/cloudflared-darwin-amd64.tgz`, filename: 'cloudflared' };
  }
  // linux
  const f = arch === 'arm64' ? 'cloudflared-linux-arm64' : 'cloudflared-linux-amd64';
  return { url: `${base}/${f}`, filename: 'cloudflared' };
}

function localPath(): string {
  const { filename } = platformBinary();
  return path.join(config.paths.dataDir, filename);
}

export function isInPath(): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(probe, ['cloudflared'], { stdio: 'ignore' });
  return r.status === 0;
}

export function resolveCloudflared(): { path: string; needsDownload: boolean } {
  if (isInPath()) return { path: 'cloudflared', needsDownload: false };
  const local = localPath();
  if (fs.existsSync(local)) return { path: local, needsDownload: false };
  return { path: local, needsDownload: true };
}

function downloadFollow(url: string, dest: string, onProgress?: (n: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    function req(u: string) {
      https.get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return req(new URL(res.headers.location, u).toString());
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} ${u}`));
        const total = Number(res.headers['content-length'] ?? 0);
        let got = 0;
        const out = fs.createWriteStream(dest);
        res.on('data', (chunk: Buffer) => {
          got += chunk.length;
          onProgress?.(got, total);
        });
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve()));
        out.on('error', reject);
      }).on('error', reject);
    }
    req(url);
  });
}

export async function downloadCloudflared(onProgress?: (pct: number) => void): Promise<string> {
  const { url } = platformBinary();
  const dest = localPath();
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (process.platform === 'darwin') {
    // .tgz — skip for now, instruct user to install via brew
    throw new Error('Mac: ติดตั้งด้วย `brew install cloudflared` แล้วลองใหม่');
  }
  await downloadFollow(url, dest, (n, total) => {
    if (total > 0) onProgress?.(Math.round((n / total) * 100));
  });
  if (process.platform !== 'win32') {
    try { fs.chmodSync(dest, 0o755); } catch {}
  }
  return dest;
}
