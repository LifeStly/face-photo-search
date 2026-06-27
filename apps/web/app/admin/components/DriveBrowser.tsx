'use client';
import { useEffect, useState } from 'react';

type Folder = { id: string; name: string };
type Crumb = { id: string | null; name: string };

export default function DriveBrowser() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: 'รากที่ service account เห็น' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<{ id: string; name: string | null } | null>(null);

  async function load(parentId: string | null) {
    setLoading(true);
    setError(null);
    try {
      const url = parentId ? `/api/admin/folders/browse?parent=${encodeURIComponent(parentId)}` : `/api/admin/folders/browse`;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'browse failed');
      setFolders(d.folders ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    const r = await fetch('/api/admin/status');
    if (r.ok) {
      const d = await r.json();
      if (d.run) setActiveFolder({ id: d.run.folderId, name: d.run.folderName });
      else setActiveFolder(null);
    }
  }

  useEffect(() => {
    load(null);
    refreshStatus();
  }, []);

  function openFolder(f: Folder) {
    setCrumbs((c) => [...c, { id: f.id, name: f.name }]);
    load(f.id);
  }

  function gotoCrumb(idx: number) {
    const c = crumbs[idx];
    setCrumbs(crumbs.slice(0, idx + 1));
    load(c.id);
  }

  async function startHere(f: Folder) {
    if (activeFolder && activeFolder.id !== f.id) {
      if (!confirm(`มีงาน "${activeFolder.name ?? activeFolder.id}" กำลังรันอยู่ — เปลี่ยนเป็น "${f.name}"?\n(งานเดิมจะถูกหยุดและทิ้ง embedding)`)) {
        return;
      }
    } else if (activeFolder?.id === f.id) {
      if (!confirm('งานนี้กำลังรันอยู่แล้ว เริ่มใหม่?')) return;
    }
    setBusy(f.id);
    try {
      const r = await fetch('/api/admin/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folderId: f.id, folderName: f.name }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'start failed');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="text-sm text-neutral-500 flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <button onClick={() => gotoCrumb(i)} className="hover:text-brand">{c.name}</button>
            </span>
          ))}
          <button onClick={() => load(crumbs[crumbs.length - 1].id)} className="ml-auto text-xs px-2 py-0.5 rounded border">
            รีเฟรช
          </button>
        </div>
        {activeFolder && (
          <div className="mt-2 text-xs text-green-600">
            กำลังรัน: {activeFolder.name ?? activeFolder.id}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading ? (
          <div className="p-4 text-sm text-neutral-500">กำลังโหลด...</div>
        ) : folders.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">
            ไม่มี sub-folder ที่ service account เห็นในระดับนี้
            <div className="mt-2 text-xs">
              ต้องแชร์ folder งานบน Drive ให้กับ email ของ service account ก่อน (อ่านได้พอ)
            </div>
          </div>
        ) : (
          folders.map((f) => {
            const isActive = activeFolder?.id === f.id;
            return (
              <div key={f.id} className="flex items-center gap-2 p-3">
                <button onClick={() => openFolder(f)} className="flex-1 text-left truncate hover:text-brand">
                  📁 {f.name}
                </button>
                {isActive && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">active</span>}
                <button
                  disabled={busy === f.id}
                  onClick={() => startHere(f)}
                  className="px-3 py-1 rounded bg-brand text-white text-xs disabled:opacity-50"
                >
                  {busy === f.id ? 'กำลังเริ่ม...' : isActive ? 'รีสตาร์ท' : 'เริ่มงานที่นี่'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
