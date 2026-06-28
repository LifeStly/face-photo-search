'use client';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type Settings = {
  appName: string;
  welcomeMessage: string;
  brandColor: string;
  publicUrl: string;
};

type TunnelStatus = { url: string | null; status: 'stopped' | 'starting' | 'running' | 'error'; message?: string };

export default function Branding() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tunnel, setTunnel] = useState<TunnelStatus>({ url: null, status: 'stopped' });
  const [tunnelBusy, setTunnelBusy] = useState(false);

  async function load() {
    const r = await fetch('/api/admin/settings');
    if (r.ok) setS(await r.json());
    const t = await fetch('/api/admin/tunnel');
    if (t.ok) setTunnel(await t.json());
  }

  useEffect(() => {
    load();
    const i = setInterval(() => {
      fetch('/api/admin/tunnel').then((r) => r.ok ? r.json() : null).then((d) => d && setTunnel(d));
    }, 5000);
    return () => clearInterval(i);
  }, []);

  async function startTunnel() {
    setTunnelBusy(true);
    try {
      const r = await fetch('/api/admin/tunnel', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'tunnel failed');
      setTunnel({ url: d.url, status: 'running' });
      if (s && d.url) setS({ ...s, publicUrl: d.url });
    } catch (e: any) {
      setMsg('✗ ' + (e?.message ?? String(e)));
    } finally {
      setTunnelBusy(false);
    }
  }

  async function stopTunnel() {
    setTunnelBusy(true);
    try {
      await fetch('/api/admin/tunnel', { method: 'DELETE' });
      setTunnel({ url: null, status: 'stopped' });
    } finally {
      setTunnelBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(s),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'save failed');
      setS(d);
      setMsg('✓ บันทึกแล้ว — รีเฟรชหน้าเว็บเพื่อดูการเปลี่ยนแปลง');
    } catch (e: any) {
      setMsg('✗ ' + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!s?.publicUrl) return;
    await navigator.clipboard.writeText(s.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!s) return <div className="text-neutral-500">กำลังโหลด...</div>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={save} className="space-y-4 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="font-semibold">หน้าตาเว็บ</h2>

        <div>
          <label className="block text-sm mb-1">ชื่องาน / app</label>
          <input
            value={s.appName}
            onChange={(e) => setS({ ...s, appName: e.target.value })}
            className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">ข้อความต้อนรับใน Feed</label>
          <textarea
            value={s.welcomeMessage}
            onChange={(e) => setS({ ...s, welcomeMessage: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">สีหลัก (brand color)</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={s.brandColor}
              onChange={(e) => setS({ ...s, brandColor: e.target.value })}
              className="h-10 w-12 rounded border bg-white"
            />
            <input
              type="text"
              value={s.brandColor}
              onChange={(e) => setS({ ...s, brandColor: e.target.value })}
              pattern="^#[0-9a-fA-F]{6}$"
              className="flex-1 px-3 py-2 rounded border bg-white dark:bg-neutral-900 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Public URL (Cloudflare Tunnel)</label>
          <input
            value={s.publicUrl}
            onChange={(e) => setS({ ...s, publicUrl: e.target.value })}
            placeholder="https://photos.example.com"
            className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-900"
          />
          <p className="text-xs text-neutral-500 mt-1">ใช้สำหรับ QR code + ปุ่ม copy</p>
        </div>

        <button disabled={busy} className="px-4 py-2 rounded bg-brand text-white disabled:opacity-50">
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>

      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <h2 className="font-semibold mb-3">เปิด Public URL ผ่าน Cloudflare Tunnel</h2>
          <p className="text-xs text-neutral-500 mb-3">
            สร้างลิงก์ <code>*.trycloudflare.com</code> ชั่วคราว แชร์ให้แขกได้ทันที (ต้องติดตั้ง <code>cloudflared</code> ก่อน — <a href="https://github.com/cloudflare/cloudflared/releases" target="_blank" rel="noreferrer" className="text-brand underline">ดาวน์โหลด</a>)
          </p>
          {tunnel.status === 'running' && tunnel.url ? (
            <>
              <div className="p-3 rounded bg-green-100 text-green-800 text-sm break-all">{tunnel.url}</div>
              <button onClick={stopTunnel} disabled={tunnelBusy} className="mt-3 px-4 py-2 rounded border border-red-300 text-red-600 text-sm disabled:opacity-50">
                {tunnelBusy ? '...' : 'ปิด tunnel'}
              </button>
            </>
          ) : (
            <button onClick={startTunnel} disabled={tunnelBusy} className="px-4 py-2 rounded bg-brand text-white text-sm disabled:opacity-50">
              {tunnelBusy ? 'กำลังเปิด...' : 'เปิด Public URL'}
            </button>
          )}
          {tunnel.status === 'error' && tunnel.message && (
            <div className="mt-3 text-xs text-red-600">{tunnel.message}</div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <h2 className="font-semibold mb-3">แชร์ให้แขก</h2>
          {s.publicUrl ? (
            <>
              <div className="bg-white p-4 rounded-lg inline-block">
                <QRCodeSVG value={s.publicUrl} size={200} level="M" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-0 truncate px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-900 text-sm">
                  {s.publicUrl}
                </code>
                <button onClick={copyUrl} className="px-3 py-2 rounded border text-sm">
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
                <a
                  href={s.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded border text-sm"
                >
                  เปิด
                </a>
              </div>
            </>
          ) : (
            <div className="text-sm text-neutral-500">ใส่ Public URL ในฟอร์มซ้ายก่อน</div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <h2 className="font-semibold mb-2">ตัวอย่างสี</h2>
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded" style={{ backgroundColor: s.brandColor }} />
            <button className="px-4 py-2 rounded text-white" style={{ backgroundColor: s.brandColor }}>
              ปุ่มตัวอย่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
