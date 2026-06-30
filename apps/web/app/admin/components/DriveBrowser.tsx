'use client';
import { useEffect, useState } from 'react';
import QRPanel from './QRPanel';
import HelpButton from '../../components/HelpButton';

type FolderInfo = {
  id: string;
  name: string;
  mode: 'live' | 'archive' | null;
  isLive: boolean;
  photoCount: number;
  processedCount: number;
  totalCount: number;
  hasData: boolean;
  qrEnabled: boolean;
  hasPassword: boolean;
  qrCode: string | null;
  accessible: boolean;
  lastSyncAt: number | null;
};

type DeleteResult = {
  folderName: string;
  saEmail: string | null;
  deleted: { runs: number; photos: number; embeddings: number };
};

export default function DriveBrowser() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saEmail, setSaEmail] = useState<string | null>(null);
  const [saError, setSaError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);

  async function loadServiceAccount() {
    try {
      const r = await fetch('/api/admin/service-account');
      const d = await r.json();
      if (d.email) setSaEmail(d.email);
      else setSaError(d.error ?? 'ไม่พบ service account');
    } catch (e: any) {
      setSaError(e?.message ?? String(e));
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function loadFolders() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/drive/folders');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'load failed');
      setFolders(d.folders ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFolders();
    loadServiceAccount();
  }, []);

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startFolder(f: FolderInfo, mode: 'live' | 'archive') {
    setBusy(f.id);
    setError(null);
    try {
      const r = await fetch('/api/admin/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folderId: f.id, folderName: f.name, mode }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'start failed');
      await loadFolders();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggleLive(f: FolderInfo) {
    setBusy(f.id);
    setError(null);
    try {
      const r = await fetch(`/api/admin/folders/${encodeURIComponent(f.id)}/toggle-live`, {
        method: 'POST',
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'toggle failed');
      await loadFolders();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function reprocessFolder(f: FolderInfo) {
    if (!confirm(`ประมวลผลใบหน้าใหม่ทั้ง ${f.photoCount} ภาพของ "${f.name}"?\n\nembeddings เดิมจะถูกลบ + ระบบจะดึง thumbnail ใหญ่ขึ้นและตรวจจับใบหน้าใหม่ — ใช้เวลา 1-2 นาที`)) return;
    setBusy(f.id);
    setError(null);
    try {
      const r = await fetch('/api/admin/runs/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: f.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'reprocess failed');
      alert(`เริ่มประมวลผลใหม่ ${d.requeued} ภาพแล้ว — รอ ~1-2 นาทีแล้ว search ใหม่`);
      await loadFolders();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function deleteFolder(f: FolderInfo) {
    if (f.isLive) {
      alert('ปิด Live ของ folder นี้ก่อนถึงจะลบได้');
      return;
    }
    const msg = f.hasData
      ? `ลบ "${f.name}" ออกจากระบบ?\n\nข้อมูลทั้งหมด (${f.photoCount} ภาพ + embeddings) จะหายเหมือนไม่เคยมี — กลับมาไม่ได้`
      : `ซ่อน "${f.name}" จากลิสต์?\n\n(ยังไม่มีข้อมูลใน DB — แค่ซ่อนจาก browse)`;
    if (!confirm(msg)) return;

    setBusy(f.id);
    setError(null);
    try {
      const r = await fetch(`/api/admin/folders/${encodeURIComponent(f.id)}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'delete failed');
      setDeleteResult(d as DeleteResult);
      await loadFolders();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Service Account section */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            Service Account Email
          </div>
          <HelpButton topic="share-folder" />
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
          แชร์ folder บน Google Drive ให้ email นี้ (สิทธิ์ Viewer พอ) แล้ว folder จะโผล่ในลิสต์ด้านล่าง
        </div>
        {saEmail ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 px-2 py-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs break-all select-all">
              {saEmail}
            </code>
            <button
              onClick={() => copyText(saEmail)}
              className="px-3 py-1.5 rounded bg-brand text-white text-xs font-medium whitespace-nowrap"
            >
              {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
        ) : saError ? (
          <div className="text-xs text-red-600">{saError}</div>
        ) : (
          <div className="text-xs text-neutral-500">กำลังโหลด...</div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Folders</h2>
            <HelpButton topic="start-work" />
          </div>
          <p className="text-xs text-neutral-500">{folders.length} folder · Live ได้ทีละ 1</p>
        </div>
        <button onClick={loadFolders} className="text-xs px-3 py-1 rounded border">
          {loading ? '...' : 'รีเฟรช'}
        </button>
      </div>

      {error && <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

      {/* Folder list */}
      <div className="space-y-2">
        {loading && folders.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">กำลังโหลด...</div>
        ) : folders.length === 0 ? (
          <div className="p-6 text-center text-sm text-neutral-500 border border-dashed rounded-xl">
            ยังไม่มี folder ที่เห็น<br />
            <span className="text-xs">ไปแชร์ folder ใน Google Drive ให้ SA ก่อน</span>
          </div>
        ) : (
          folders.map((f) => (
            <FolderCard
              key={f.id}
              f={f}
              expanded={expanded.has(f.id)}
              busy={busy === f.id}
              onToggleExpand={() => toggleExpanded(f.id)}
              onToggleLive={() => toggleLive(f)}
              onStart={(mode) => startFolder(f, mode)}
              onDelete={() => deleteFolder(f)}
              onReprocess={() => reprocessFolder(f)}
              onRefresh={loadFolders}
            />
          ))
        )}
      </div>

      {/* Delete confirmation popup */}
      {deleteResult && (
        <DeleteCompletedModal result={deleteResult} onClose={() => setDeleteResult(null)} />
      )}
    </div>
  );
}

function FolderCard({
  f,
  expanded,
  busy,
  onToggleExpand,
  onToggleLive,
  onStart,
  onDelete,
  onReprocess,
  onRefresh,
}: {
  f: FolderInfo;
  expanded: boolean;
  busy: boolean;
  onToggleExpand: () => void;
  onToggleLive: () => void;
  onStart: (mode: 'live' | 'archive') => void;
  onDelete: () => void;
  onReprocess: () => void;
  onRefresh: () => void | Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Compact row */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <span className="text-neutral-400 text-xs">{expanded ? '▼' : '▶'}</span>
        <span className="text-lg">📁</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{f.name}</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {f.isLive ? (
              <span className="text-green-600 font-medium">● LIVE · </span>
            ) : null}
            {f.hasData ? (
              <>
                {f.photoCount.toLocaleString()} ภาพ
                {f.qrEnabled && (
                  <> · QR {f.hasPassword ? '🔒 มีรหัส' : '🔓 ไม่มีรหัส'}</>
                )}
                {!f.accessible && <span className="text-amber-600"> · (SA เข้าไม่ได้)</span>}
              </>
            ) : (
              <span className="text-neutral-500">ยังไม่เริ่มงาน</span>
            )}
          </div>
        </div>
        {f.isLive && (
          <span className="px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-medium whitespace-nowrap">
            🟢 LIVE
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          {/* Mode toggle / start buttons */}
          {!f.hasData ? (
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">ยังไม่มีข้อมูล folder นี้ใน DB</div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  onClick={() => onStart('live')}
                  className="flex-1 min-w-[140px] px-3 py-2 rounded bg-green-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  🚀 เริ่มงาน + LIVE
                </button>
                <button
                  disabled={busy}
                  onClick={() => onStart('archive')}
                  className="flex-1 min-w-[140px] px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 text-sm font-medium disabled:opacity-50"
                >
                  📦 sync เก็บเป็น Archive
                </button>
                <button
                  disabled={busy}
                  onClick={onDelete}
                  className="px-3 py-2 rounded border border-red-300 text-red-600 text-sm disabled:opacity-50"
                >
                  🗑️ ซ่อน
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Mode</div>
                  <button
                    disabled={busy}
                    onClick={onToggleLive}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                      f.isLive
                        ? 'bg-green-500 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    } disabled:opacity-50`}
                  >
                    {f.isLive ? '🟢 LIVE — กดเพื่อหยุด' : '⚪ Archive — กดเพื่อเปิด Live'}
                  </button>
                </div>
                {f.processedCount < f.totalCount && f.isLive && (
                  <div className="text-xs text-neutral-500">
                    Embed: {f.processedCount}/{f.totalCount}
                  </div>
                )}
              </div>

              <QRPanel
                folderId={f.id}
                folderName={f.name}
                enabled={f.qrEnabled}
                hasPassword={f.hasPassword}
                code={f.qrCode}
                onChange={onRefresh}
              />

              {/* Re-process action */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  disabled={busy}
                  onClick={onReprocess}
                  className="px-3 py-1.5 rounded border border-brand text-brand text-xs disabled:opacity-30"
                  title="ลบ embeddings เดิม + ตรวจจับใบหน้าใหม่ทั้งหมด (ใช้หลังปรับ tune detection)"
                >
                  🔁 ประมวลผลใบหน้าใหม่ทั้งหมด
                </button>
                <span className="ml-2 text-[11px] text-neutral-500">ใช้เมื่อค้นหาเจอน้อยเกิน → ลองตั้งค่าใหม่</span>
              </div>

              {/* Delete button */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                <button
                  disabled={busy || f.isLive}
                  onClick={onDelete}
                  className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-xs disabled:opacity-30"
                  title={f.isLive ? 'ปิด Live ก่อนถึงจะลบได้' : 'ลบ folder + ข้อมูลทั้งหมด'}
                >
                  🗑️ ลบ folder นี้
                </button>
                <HelpButton topic="delete-folder" variant="link" label="วิธีลบให้เกลี้ยง" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteCompletedModal({
  result,
  onClose,
}: {
  result: DeleteResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    if (!result.saEmail) return;
    try {
      await navigator.clipboard.writeText(result.saEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold mb-1">✓ ลบข้อมูลเรียบร้อย</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ลบ <span className="font-medium">{result.folderName}</span> ออกจาก DB แล้ว
            ({result.deleted.photos.toLocaleString()} ภาพ, {result.deleted.embeddings.toLocaleString()} embeddings)
          </p>
        </div>

        <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
            ⚠️ ขั้นตอนสุดท้าย: ลบ share ใน Google Drive
          </div>
          <ol className="text-xs text-amber-900 dark:text-amber-100 space-y-1 list-decimal list-inside">
            <li>เปิด Google Drive → คลิกขวา folder <strong>"{result.folderName}"</strong></li>
            <li>กด <strong>Share</strong></li>
            <li>หา email นี้ในรายการ:</li>
          </ol>
          {result.saEmail && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 px-2 py-1.5 rounded bg-white dark:bg-neutral-900 border text-xs break-all">
                {result.saEmail}
              </code>
              <button
                onClick={copyEmail}
                className="px-3 py-1.5 rounded bg-amber-500 text-white text-xs font-medium whitespace-nowrap"
              >
                {copied ? '✓ คัดลอก' : 'คัดลอก'}
              </button>
            </div>
          )}
          <ol start={4} className="text-xs text-amber-900 dark:text-amber-100 mt-2 space-y-1 list-decimal list-inside">
            <li>คลิก ❌ ข้าง email นั้น → กด <strong>Save</strong></li>
          </ol>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 italic">
            ถ้าไม่ทำ folder จะยังโผล่ใน &ldquo;Shared with me&rdquo; ของ SA — แต่ระบบจะซ่อนไม่ให้แสดงในลิสต์อยู่แล้ว
          </p>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-brand text-white text-sm font-medium">
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
