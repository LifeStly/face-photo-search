'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export type GridPhoto = {
  id: string;
  name: string;
  topRightBadge?: string;
  topLeftBadge?: string;
};

export default function PhotoGrid({ photos, storageKey }: { photos: GridPhoto[]; storageKey?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) setSelected(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(Array.from(selected))); } catch {}
  }, [selected, storageKey]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll() { setSelected(new Set(photos.map((p) => p.id))); }
  function clear() { setSelected(new Set()); }

  async function downloadAll() {
    if (selected.size === 0) return;
    setDownloading(true); setError(null); setProgress(0);
    const ids = Array.from(selected);
    const nameById = new Map(photos.map((p) => [p.id, p.name]));

    const w = window as any;
    const fsaa = typeof w.showDirectoryPicker === 'function';

    try {
      let dirHandle: any = null;
      if (fsaa) {
        try {
          dirHandle = await w.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
        } catch (e: any) {
          if (e?.name === 'AbortError') { setDownloading(false); return; }
          // ปฏิเสธ permission → fallback ปกติ
          dirHandle = null;
        }
      }

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const res = await fetch(`/api/photos/${encodeURIComponent(id)}/file?dl=1`);
        if (!res.ok) throw new Error(`โหลดล้มเหลว: ${nameById.get(id) ?? id}`);
        const blob = await res.blob();
        const filename = nameById.get(id) ?? `photo-${id}.jpg`;

        if (dirHandle) {
          // FSAA: เขียนตรงเข้า folder ที่ user เลือก (ไม่มี popup ต่อไฟล์)
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          // Fallback: traditional <a download> — ลงที่ browser default Downloads folder
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise((r) => setTimeout(r, 300));
          URL.revokeObjectURL(url);
        }
        setProgress(i + 1);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setDownloading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mb-3 flex justify-end gap-2 text-sm">
        <button onClick={selectAll} className="px-3 py-1 rounded border">เลือกทั้งหมด</button>
        {selected.size > 0 && <button onClick={clear} className="px-3 py-1 rounded border">ล้าง ({selected.size})</button>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-24">
        {photos.map((p) => {
          const isSel = selected.has(p.id);
          return (
            <div key={p.id} className={`relative rounded-lg overflow-hidden border-2 ${isSel ? 'border-brand' : 'border-transparent'}`}>
              <button
                onClick={(e) => { e.preventDefault(); toggle(p.id); }}
                className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition ${isSel ? 'bg-brand text-white border-brand' : 'bg-white/90 dark:bg-neutral-800/90 border-neutral-300'}`}
                aria-label="select"
              >
                {isSel ? '✓' : ''}
              </button>
              {p.topLeftBadge && (
                <span className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[10px] font-medium">{p.topLeftBadge}</span>
              )}
              <Link href={`/photo/${encodeURIComponent(p.id)}`} className="block">
                <div className="aspect-square bg-neutral-200 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${encodeURIComponent(p.id)}/file?size=thumb`} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="mt-1 px-1 text-xs text-neutral-600 dark:text-neutral-400 flex justify-between">
                  <span className="truncate">{p.name}</span>
                  {p.topRightBadge && <span className="font-medium text-brand">{p.topRightBadge}</span>}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur z-20">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">
              {downloading ? `กำลังโหลด ${progress}/${selected.size} ...` : `เลือก ${selected.size} ภาพ`}
            </span>
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="px-5 py-2 rounded bg-brand text-white text-sm font-medium disabled:opacity-50"
            >
              {downloading ? `${progress}/${selected.size}` : `ดาวน์โหลด (${selected.size})`}
            </button>
          </div>
          {selected.size > 1 && !downloading && (
            <div className="mx-auto max-w-5xl px-4 pb-2 text-xs text-neutral-500">
              ⓘ จะถามให้เลือก folder ครั้งเดียว แล้วบันทึกทุกไฟล์ลงที่นั่น (Chrome/Edge desktop)
            </div>
          )}
        </div>
      )}

      {error && <div className="fixed bottom-20 right-4 max-w-md p-3 rounded bg-red-100 text-red-800 text-sm shadow-lg">{error}</div>}
    </>
  );
}
