'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconDownload, IconX } from './components/icons';

export type GridPhoto = {
  id: string;
  name: string;
  topRightBadge?: string;
  topLeftBadge?: string;
};

type DownloadMode = 'mobile-share' | 'mobile-zip' | 'desktop-fsaa' | 'desktop-zip';

export type PhotoUrls = {
  thumb: (id: string) => string;
  download: (id: string) => string;
  zip: string;
  view: (id: string) => string;
};

const defaultUrls: PhotoUrls = {
  thumb: (id) => `/api/photos/${encodeURIComponent(id)}/file?size=thumb`,
  download: (id) => `/api/photos/${encodeURIComponent(id)}/file?dl=1`,
  zip: '/api/photos/download-zip',
  view: (id) => `/photo/${encodeURIComponent(id)}`,
};

export default function PhotoGrid({
  photos,
  storageKey,
  urls = defaultUrls,
}: {
  photos: GridPhoto[];
  storageKey?: string;
  urls?: PhotoUrls;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'sharing' | 'zipping'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DownloadMode>('desktop-zip');

  useEffect(() => {
    const w = window as any;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|SamsungBrowser/i.test(navigator.userAgent);
    let canShareFiles = false;
    if (typeof (navigator as any).canShare === 'function') {
      try {
        const dummy = new File([new Blob(['x'])], 'x.jpg', { type: 'image/jpeg' });
        canShareFiles = (navigator as any).canShare({ files: [dummy] });
      } catch {}
    }
    const hasFsaa = typeof w.showDirectoryPicker === 'function';
    if (isMobile && canShareFiles) setMode('mobile-share');
    else if (isMobile) setMode('mobile-zip');
    else if (hasFsaa) setMode('desktop-fsaa');
    else setMode('desktop-zip');
  }, []);

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

  function anchorDownload(href: string, filename: string) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function downloadZip(ids: string[]) {
    setPhase('zipping');
    const res = await fetch(urls.zip, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('ดาวน์โหลด ZIP ไม่สำเร็จ');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    anchorDownload(url, `photos-${Date.now()}.zip`);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function fetchAsFiles(ids: string[], nameById: Map<string, string>): Promise<File[]> {
    setPhase('fetching');
    const files: File[] = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const filename = nameById.get(id) ?? `photo-${id}.jpg`;
      const res = await fetch(urls.download(id));
      if (!res.ok) throw new Error(`โหลดล้มเหลว: ${filename}`);
      const blob = await res.blob();
      files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
      setProgress(i + 1);
    }
    return files;
  }

  async function downloadAll() {
    if (selected.size === 0) return;
    setDownloading(true); setError(null); setProgress(0); setPhase('idle');
    const ids = Array.from(selected);
    const nameById = new Map(photos.map((p) => [p.id, p.name]));

    // 1 ไฟล์ → anchor ตรงๆ ทุก platform — เร็วสุด user confirm ครั้งเดียว
    if (ids.length === 1) {
      const id = ids[0];
      anchorDownload(urls.download(id), nameById.get(id) ?? `photo-${id}.jpg`);
      setDownloading(false);
      return;
    }

    try {
      if (mode === 'mobile-share') {
        // มือถือ + Web Share API รับ files → fetch ทุกไฟล์ → เปิด share sheet
        const files = await fetchAsFiles(ids, nameById);
        setPhase('sharing');
        try {
          if (!(navigator as any).canShare?.({ files })) throw new Error('canShare returned false');
          await (navigator as any).share({ files, title: 'Photos' });
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return; // user ยกเลิกเอง
          // share() ปฏิเสธ → fall back เป็น ZIP (browser ส่ง zip download)
          await downloadZip(ids);
        }
      } else if (mode === 'desktop-fsaa') {
        // Desktop Chromium → ถามโฟลเดอร์ครั้งเดียว เขียนตรง
        const w = window as any;
        let dirHandle: any = null;
        try {
          dirHandle = await w.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
          dirHandle = null;
        }
        if (!dirHandle) { await downloadZip(ids); return; }

        setPhase('fetching');
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const filename = nameById.get(id) ?? `photo-${id}.jpg`;
          try {
            const res = await fetch(urls.download(id));
            if (!res.ok) throw new Error(`โหลดล้มเหลว: ${filename}`);
            const blob = await res.blob();
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            setProgress(i + 1);
          } catch (fsaaErr: any) {
            // FSAA พังกลางทาง → ทิ้ง แล้ว ZIP ที่เหลือ + ที่เพิ่งพัง
            await downloadZip(ids.slice(i));
            return;
          }
        }
      } else {
        // mobile-zip หรือ desktop-zip → server zip ส่ง stream ลง browser
        await downloadZip(ids);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setDownloading(false);
      setPhase('idle');
      setTimeout(() => setProgress(0), 2000);
    }
  }

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mb-4 flex justify-end gap-2 text-sm">
        <button
          onClick={selectAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand transition"
        >
          <IconCheck className="w-3.5 h-3.5" />
          เลือกทั้งหมด
        </button>
        {selected.size > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 transition"
          >
            <IconX className="w-3.5 h-3.5" />
            ล้าง ({selected.size})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-28">
        {photos.map((p) => {
          const isSel = selected.has(p.id);
          return (
            <div
              key={p.id}
              className={`group relative rounded-xl overflow-hidden ring-2 transition ${
                isSel ? 'ring-brand' : 'ring-transparent hover:ring-neutral-300 dark:hover:ring-neutral-700'
              }`}
            >
              <button
                onClick={(e) => { e.preventDefault(); toggle(p.id); }}
                className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition shadow-sm ${
                  isSel
                    ? 'bg-brand text-white'
                    : 'bg-white/90 dark:bg-neutral-900/90 text-transparent hover:text-neutral-400 ring-1 ring-neutral-300 dark:ring-neutral-700'
                }`}
                aria-label="select"
              >
                <IconCheck className="w-4 h-4" />
              </button>
              {p.topLeftBadge && (
                <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold shadow-sm">{p.topLeftBadge}</span>
              )}
              <Link href={urls.view(p.id)} className="block">
                <div className="aspect-square bg-neutral-200 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls.thumb(p.id)}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                {p.topRightBadge && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-semibold">
                    {p.topRightBadge}
                  </div>
                )}
              </Link>
              <div className="mt-1.5 px-1 text-[11px] text-neutral-500 truncate">{p.name}</div>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand/15 text-brand text-xs font-bold">
                {selected.size}
              </span>
              {!downloading && 'ภาพถูกเลือก'}
              {downloading && phase === 'fetching' && `กำลังเตรียม ${progress}/${selected.size}...`}
              {downloading && phase === 'sharing' && 'เปิดเมนูแชร์...'}
              {downloading && phase === 'zipping' && 'กำลังสร้าง ZIP...'}
              {downloading && phase === 'idle' && 'กำลังเริ่ม...'}
            </span>
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition"
            >
              <IconDownload className="w-4 h-4" />
              {downloading ? 'กำลังโหลด...' : 'ดาวน์โหลด'}
            </button>
          </div>
          {selected.size > 1 && !downloading && (
            <div className="mx-auto max-w-5xl px-4 pb-2 text-xs text-neutral-500">
              {mode === 'mobile-share' && 'ⓘ จะเปิดเมนูแชร์ของมือถือ → กด "บันทึกรูปภาพ" เพื่อลงแกลเลอรีทั้งหมด'}
              {mode === 'mobile-zip' && 'ⓘ จะได้ไฟล์ ZIP 1 ไฟล์ เปิด/แตกไฟล์ในแอป Files ของมือถือ'}
              {mode === 'desktop-fsaa' && 'ⓘ จะถามให้เลือก folder ครั้งเดียว แล้วบันทึกทุกไฟล์ลงที่นั่น'}
              {mode === 'desktop-zip' && 'ⓘ จะได้ไฟล์ ZIP 1 ไฟล์'}
            </div>
          )}
        </div>
      )}

      {error && <div className="fixed bottom-20 right-4 max-w-md p-3 rounded bg-red-100 text-red-800 text-sm shadow-lg">{error}</div>}
    </>
  );
}
