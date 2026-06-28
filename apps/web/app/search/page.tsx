'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'fps_search_state';

type Match = {
  photoId: string;
  similarity: number;
  thumbnailUrl: string | null;
  name: string;
};

export default function SearchPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // restore last search results when returning to this page (e.g. after viewing a photo)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { matches: Match[]; selected: string[] };
        if (Array.isArray(saved.matches)) setMatches(saved.matches);
        if (Array.isArray(saved.selected)) setSelected(new Set(saved.selected));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (matches == null) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ matches, selected: Array.from(selected) }));
    } catch {}
  }, [matches, selected]);

  function clearResults() {
    setMatches(null);
    setSelected(new Set());
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll() {
    if (!matches) return;
    setSelected(new Set(matches.map((m) => m.photoId)));
  }
  function clearSel() { setSelected(new Set()); }

  async function downloadSelected() {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/photos/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photos-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setDownloading(false);
    }
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (e: any) {
      setError('ไม่สามารถเปิดกล้องได้: ' + (e?.message ?? String(e)));
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }

  async function blobToFormData(blob: Blob): Promise<FormData> {
    const fd = new FormData();
    fd.append('selfie', blob, 'selfie.jpg');
    return fd;
  }

  async function sendForSearch(blob: Blob) {
    setBusy(true);
    setError(null);
    clearResults();
    try {
      const fd = await blobToFormData(blob);
      const res = await fetch('/api/search', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'search failed');
      setMatches(data.matches as Match[]);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function snapAndSearch() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
    stopCamera();
    await sendForSearch(blob);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await sendForSearch(f);
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-2">ค้นหาภาพตัวเอง</h1>
      <p className="text-sm text-neutral-500 mb-4">ถ่าย selfie หรืออัปโหลดรูปหน้าตรง ระบบจะหาภาพที่มีคุณอยู่</p>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
        <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center mb-3">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {!streaming && <div className="absolute text-neutral-400 text-sm">กล้องยังไม่เปิด</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!streaming ? (
            <button onClick={startCamera} className="px-4 py-2 rounded bg-brand text-white">เปิดกล้อง</button>
          ) : (
            <>
              <button onClick={snapAndSearch} disabled={busy} className="px-4 py-2 rounded bg-brand text-white disabled:opacity-50">{busy ? 'กำลังค้นหา...' : 'ถ่าย & ค้นหา'}</button>
              <button onClick={stopCamera} className="px-4 py-2 rounded border">ยกเลิก</button>
            </>
          )}
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded border">อัปโหลดรูป</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

      {matches && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold">ผลลัพธ์ ({matches.length})</h2>
            <div className="flex gap-2 text-sm">
              {matches.length > 0 && (
                <>
                  <button onClick={selectAll} className="px-3 py-1 rounded border">เลือกทั้งหมด</button>
                  {selected.size > 0 && <button onClick={clearSel} className="px-3 py-1 rounded border">ล้าง ({selected.size})</button>}
                </>
              )}
              <button onClick={clearResults} className="px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-500">ค้นหาใหม่</button>
            </div>
          </div>
          {matches.length === 0 ? (
            <div className="text-neutral-500">ไม่พบภาพที่ตรงกับใบหน้าของคุณ</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-24">
              {matches.map((m) => {
                const isSel = selected.has(m.photoId);
                return (
                  <div key={m.photoId} className={`relative rounded-lg overflow-hidden border-2 ${isSel ? 'border-brand' : 'border-transparent'}`}>
                    <button
                      onClick={(e) => { e.preventDefault(); toggle(m.photoId); }}
                      className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition ${isSel ? 'bg-brand text-white border-brand' : 'bg-white/90 dark:bg-neutral-800/90 border-neutral-300'}`}
                      aria-label="select"
                    >
                      {isSel ? '✓' : ''}
                    </button>
                    <Link href={`/photo/${encodeURIComponent(m.photoId)}`} className="block">
                      <div className="aspect-square bg-neutral-200 dark:bg-neutral-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/photos/${encodeURIComponent(m.photoId)}/file?size=thumb`} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="mt-1 px-1 text-xs text-neutral-600 dark:text-neutral-400 flex justify-between">
                        <span className="truncate">{m.name}</span>
                        <span className="font-medium text-brand">{m.similarity}%</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          {selected.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur z-20">
              <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm">เลือก {selected.size} ภาพ</span>
                <button
                  onClick={downloadSelected}
                  disabled={downloading}
                  className="px-5 py-2 rounded bg-brand text-white text-sm font-medium disabled:opacity-50"
                >
                  {downloading ? 'กำลังเตรียม ZIP...' : `ดาวน์โหลด ZIP (${selected.size})`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
