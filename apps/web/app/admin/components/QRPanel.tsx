'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import HelpButton from '../../components/HelpButton';

export default function QRPanel({
  folderId,
  folderName,
  enabled,
  hasPassword,
  code,
  onChange,
}: {
  folderId: string;
  folderName: string;
  enabled: boolean;
  hasPassword: boolean;
  code: string | null;
  onChange: () => void | Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [usePassword, setUsePassword] = useState(hasPassword);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);

  useEffect(() => { setUsePassword(hasPassword); }, [hasPassword]);

  // ดึง tunnel URL — ถ้า Cloudflare เปิดอยู่ ใช้ URL นั้นใน QR แทน localhost
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/admin/tunnel');
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        setTunnelUrl(d.status === 'running' && d.url ? d.url : null);
      } catch {}
    }
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = tunnelUrl || browserOrigin;
  const isLocalOnly = !tunnelUrl && /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(browserOrigin);
  const eventUrl = code ? `${baseUrl}/event/${code}` : null;

  useEffect(() => {
    if (!eventUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, eventUrl, { width: 220, margin: 1, errorCorrectionLevel: 'M' }).catch(() => {});
  }, [eventUrl]);

  async function enableQR() {
    setBusy(true);
    setError(null);
    try {
      const body: { password?: string | null } = {};
      if (usePassword) {
        if (!password) throw new Error('ใส่รหัสผ่านก่อน');
        body.password = password;
      } else {
        body.password = null;
      }
      const r = await fetch(`/api/admin/folders/${encodeURIComponent(folderId)}/qr`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'enable failed');
      setPassword('');
      await onChange();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disableQR() {
    if (!confirm('ปิด QR ของงานนี้? — code เดิมจะใช้ไม่ได้อีก')) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/folders/${encodeURIComponent(folderId)}/qr`, { method: 'DELETE' });
      if (!r.ok) throw new Error('disable failed');
      await onChange();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!eventUrl) return;
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function downloadPNG() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${folderName.replace(/[^\w-]+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function print() {
    if (!eventUrl || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const html = `
      <!doctype html><html><head><title>${folderName} — QR</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 28px; margin-bottom: 24px; }
        img { width: 320px; height: 320px; }
        .url { font-family: monospace; font-size: 14px; margin-top: 16px; color: #555; word-break: break-all; }
      </style></head>
      <body>
        <h1>${folderName}</h1>
        <img src="${dataUrl}" alt="QR" />
        <div class="url">${eventUrl}</div>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  if (!enabled) {
    return (
      <div className="space-y-3 border-t pt-3 border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">QR สำหรับให้ผู้ใช้ค้นหา</div>
          <HelpButton topic="qr-code" />
        </div>
        <div className="text-xs text-neutral-500">
          เปิด QR เพื่อให้ผู้ใช้สแกนเข้าหน้าค้นหาเฉพาะงานนี้
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
          ใช้รหัสผ่าน
        </label>
        {usePassword && (
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน"
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
          />
        )}
        {error && <div className="text-xs text-red-600">{error}</div>}
        <button
          disabled={busy || (usePassword && !password)}
          onClick={enableQR}
          className="px-4 py-2 rounded bg-brand text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? '...' : 'เปิด QR'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t pt-3 border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">QR สำหรับผู้ใช้ค้นหา</div>
            <HelpButton topic="qr-code" />
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {hasPassword ? '🔒 มีรหัสผ่าน' : '🔓 ไม่มีรหัสผ่าน (สาธารณะ)'}
          </div>
        </div>
        <button
          disabled={busy}
          onClick={disableQR}
          className="text-xs px-2.5 py-1 rounded border border-red-300 text-red-600 disabled:opacity-50"
        >
          ปิด QR
        </button>
      </div>

      {isLocalOnly && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          ⚠️ ยังไม่ได้เปิด Public URL — QR ตอนนี้ชี้ <code>localhost</code> สแกนจากมือถือ/คนนอกไม่ได้ <br />
          กดปุ่ม "▶ เปิด Public URL" ที่ banner ด้านบนก่อน แล้ว QR จะอัพเดทเป็น tunnel URL อัตโนมัติ
        </div>
      )}
      {tunnelUrl && (
        <div className="text-[11px] text-green-700 dark:text-green-300">
          ✓ ใช้ Public URL (Cloudflare): <code className="break-all">{tunnelUrl}</code>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="bg-white p-2 rounded">
          <canvas ref={canvasRef} />
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="text-xs text-neutral-500">ชื่องาน (แสดงด้านบน QR เวลาพิมพ์)</div>
          <div className="font-medium text-sm">{folderName}</div>
          <div className="text-xs text-neutral-500 mt-2">URL</div>
          <div className="flex gap-1">
            <code className="flex-1 min-w-0 px-2 py-1 rounded bg-neutral-50 dark:bg-neutral-900 border text-xs break-all">
              {eventUrl}
            </code>
            <button onClick={copyUrl} className="px-2 py-1 rounded border text-xs whitespace-nowrap">
              {copied ? '✓' : 'คัดลอก'}
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={downloadPNG} className="px-3 py-1.5 rounded border text-xs">⬇️ PNG</button>
            <button onClick={print} className="px-3 py-1.5 rounded border text-xs">🖨️ พิมพ์</button>
          </div>
        </div>
      </div>

      {/* เปลี่ยน password */}
      <details className="text-xs">
        <summary className="cursor-pointer text-neutral-500 hover:text-brand">เปลี่ยนรหัสผ่าน / ตั้งค่าใหม่</summary>
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
            ใช้รหัสผ่าน
          </label>
          {usePassword && (
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่านใหม่"
              className="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs"
            />
          )}
          <button
            disabled={busy || (usePassword && !password)}
            onClick={enableQR}
            className="px-3 py-1 rounded bg-brand text-white text-xs disabled:opacity-50"
          >
            อัพเดท
          </button>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      </details>
    </div>
  );
}
