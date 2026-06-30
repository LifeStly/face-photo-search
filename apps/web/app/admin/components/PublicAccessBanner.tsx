'use client';
import { useEffect, useState } from 'react';

type TunnelStatus = {
  url: string | null;
  status: 'stopped' | 'starting' | 'running' | 'error';
  message?: string;
};

export default function PublicAccessBanner() {
  const [tunnel, setTunnel] = useState<TunnelStatus>({ url: null, status: 'stopped' });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch('/api/admin/tunnel');
      if (r.ok) setTunnel(await r.json());
    } catch {}
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/tunnel', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'start failed');
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!confirm('ปิด Public URL? — QR ทุกอันที่สแกนจาก internet จะใช้ไม่ได้ทันที')) return;
    setBusy(true);
    try {
      await fetch('/api/admin/tunnel', { method: 'DELETE' });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!tunnel.url) return;
    try {
      await navigator.clipboard.writeText(tunnel.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  // Running — แสดงแบบ compact สีเขียว
  if (tunnel.status === 'running' && tunnel.url) {
    return (
      <div className="mb-4 rounded-xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-green-700 dark:text-green-300 font-semibold">Public URL เปิดอยู่ — QR ทั้งหมดใช้ URL นี้อัตโนมัติ</div>
            <code className="text-xs font-mono text-green-800 dark:text-green-200 break-all">{tunnel.url}</code>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={copy} className="px-2.5 py-1 rounded border border-green-300 text-green-700 dark:text-green-300 text-xs">
            {copied ? '✓' : 'คัดลอก'}
          </button>
          <button onClick={stop} disabled={busy} className="px-2.5 py-1 rounded border border-red-300 text-red-600 text-xs disabled:opacity-50">
            ปิด
          </button>
        </div>
      </div>
    );
  }

  // Starting
  if (tunnel.status === 'starting') {
    return (
      <div className="mb-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          กำลังเปิด Cloudflare tunnel...
        </div>
        {tunnel.message && <div className="text-xs mt-1 opacity-80">{tunnel.message}</div>}
      </div>
    );
  }

  // Stopped / error — prominent CTA
  return (
    <div className="mb-4 rounded-xl border-2 border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="text-2xl">🌐</div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
            ขั้นแรก: เปิด Public URL ก่อน
          </h2>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            เปิด Cloudflare tunnel <strong>ครั้งเดียว</strong> — QR ที่สร้างหลังจากนี้จะใช้ URL ของ tunnel อัตโนมัติ <br />
            (ถ้าไม่เปิด: QR จะชี้ไป <code>localhost</code> → คนนอกสแกนไม่ได้)
          </p>
        </div>
        <button
          onClick={start}
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50"
        >
          {busy ? 'กำลังเปิด...' : '▶ เปิด Public URL'}
        </button>
      </div>
      {(error || tunnel.message) && tunnel.status === 'error' && (
        <div className="mt-3 text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/40 rounded px-3 py-2">
          {error || tunnel.message}
        </div>
      )}
    </div>
  );
}
