import { spawn, ChildProcess } from 'child_process';

type TunnelState = {
  url: string | null;
  status: 'stopped' | 'starting' | 'running' | 'error';
  message?: string;
  proc?: ChildProcess;
};

const G = globalThis as any;
function state(): TunnelState {
  if (!G.__fpsTunnel) G.__fpsTunnel = { url: null, status: 'stopped' as const };
  return G.__fpsTunnel;
}

export function getTunnelStatus() {
  const s = state();
  return { url: s.url, status: s.status, message: s.message };
}

export function startTunnel(localPort = 3000): Promise<{ url: string }> {
  const s = state();
  if (s.status === 'running' && s.url) return Promise.resolve({ url: s.url });
  if (s.status === 'starting') return Promise.reject(new Error('กำลังเปิด tunnel อยู่'));

  s.status = 'starting';
  s.url = null;
  s.message = undefined;

  return new Promise<{ url: string }>((resolve, reject) => {
    let proc: ChildProcess;
    try {
      proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${localPort}`, '--no-autoupdate'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
    } catch (e: any) {
      s.status = 'error';
      s.message = 'cloudflared ไม่พบ — ติดตั้ง https://github.com/cloudflare/cloudflared/releases';
      return reject(new Error(s.message));
    }

    s.proc = proc;

    let resolved = false;
    const handleData = (chunk: Buffer) => {
      const text = chunk.toString();
      const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && !resolved) {
        resolved = true;
        s.url = m[0];
        s.status = 'running';
        resolve({ url: m[0] });
      }
    };
    proc.stdout?.on('data', handleData);
    proc.stderr?.on('data', handleData);

    proc.on('error', (err) => {
      s.status = 'error';
      s.message = `cloudflared ไม่พบ ติดตั้งก่อน: ${err.message}`;
      if (!resolved) { resolved = true; reject(new Error(s.message)); }
    });
    proc.on('exit', (code) => {
      if (s.status === 'running' || s.status === 'starting') {
        s.status = 'stopped';
        s.url = null;
        s.message = `tunnel exited (code ${code})`;
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        s.status = 'error';
        s.message = 'cloudflared ไม่ตอบใน 20 วินาที — ตรวจ network';
        try { proc.kill(); } catch {}
        reject(new Error(s.message));
      }
    }, 20000);
  });
}

export function stopTunnel() {
  const s = state();
  if (s.proc) {
    try { s.proc.kill(); } catch {}
    s.proc = undefined;
  }
  s.status = 'stopped';
  s.url = null;
  s.message = undefined;
}
