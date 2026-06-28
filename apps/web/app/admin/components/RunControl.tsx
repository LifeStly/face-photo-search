'use client';
import { useEffect, useState } from 'react';

type Status = {
  run: {
    id: number;
    folderId: string;
    folderName: string | null;
    total: number;
    processed: number;
    failed: number;
    status: string;
    startedAt: number;
  } | null;
  queue: { face: number; driveSyncScheduled: boolean };
};

export default function RunControl() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch('/api/admin/status');
    if (r.ok) setStatus(await r.json());
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  async function action(label: string, url: string) {
    setBusy(label);
    setMsg(null);
    try {
      const r = await fetch(url, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'failed');
      setMsg(`✓ ${label}${d.retried != null ? ` (${d.retried} ภาพ)` : ''}`);
      await refresh();
    } catch (e: any) {
      setMsg(`✗ ${label}: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const r = status?.run;
  const pct = r && r.total > 0 ? Math.round((r.processed / r.total) * 100) : 0;
  const isRunning = r?.status === 'running';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="font-semibold mb-3">สถานะงานปัจจุบัน</h2>
        {r ? (
          <>
            <div className="text-sm space-y-1">
              <div>
                Folder: <span className="font-medium">{r.folderName ?? r.folderId}</span>
              </div>
              <div>
                สถานะ:{' '}
                <span className={`font-medium ${r.status === 'running' ? 'text-green-600' : 'text-neutral-500'}`}>
                  {r.status}
                </span>
              </div>
              <div>เริ่มเมื่อ: {new Date(r.startedAt).toLocaleString('th-TH')}</div>
            </div>
            <div className="mt-3">
              <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {r.processed} / {r.total} ภาพ ({pct}%) · failed {r.failed}
              </div>
            </div>
          </>
        ) : (
          <div className="text-neutral-500">ยังไม่มีงานที่กำลังรัน — ไปที่ tab "Drive" เพื่อเลือก folder</div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="font-semibold mb-3">การกระทำ</h2>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!isRunning || busy != null}
            onClick={() => action('Sync ทันที', '/api/admin/runs/sync-now')}
            className="px-4 py-2 rounded bg-brand text-white text-sm disabled:opacity-50"
          >
            {busy === 'Sync ทันที' ? 'กำลังทำงาน...' : 'Sync ภาพใหม่ทันที'}
          </button>
          <button
            disabled={!isRunning || busy != null || !r || r.failed === 0}
            onClick={() => action('Retry failed', '/api/admin/runs/retry-failed')}
            className="px-4 py-2 rounded border text-sm disabled:opacity-50"
          >
            {busy === 'Retry failed' ? 'กำลัง retry...' : `Retry ภาพที่ fail (${r?.failed ?? 0})`}
          </button>
          <button
            disabled={!isRunning || busy != null}
            onClick={() => {
              if (!confirm('หยุดงานปัจจุบัน? Job ใน queue จะถูกลบทิ้ง')) return;
              action('Stop run', '/api/admin/runs/stop');
            }}
            className="px-4 py-2 rounded border border-red-300 text-red-600 text-sm disabled:opacity-50"
          >
            หยุดงาน
          </button>
        </div>
        {msg && <div className="mt-3 text-sm">{msg}</div>}
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="font-semibold mb-3">Queue</h2>
        <div className="text-sm space-y-1">
          <div>Face processing: <span className="font-medium">{status?.queue?.face ?? 0}</span> ภาพในคิว</div>
          <div>Drive sync: <span className="font-medium">{status?.queue?.driveSyncScheduled ? 'กำลัง poll' : 'หยุด'}</span></div>
        </div>
      </div>
    </div>
  );
}
