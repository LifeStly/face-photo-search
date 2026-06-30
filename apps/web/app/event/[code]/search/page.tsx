'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import SearchSpinner from '../../../components/SearchSpinner';
import {
  IconArrowLeft,
  IconCamera,
  IconCheck,
  IconDownload,
  IconFaceFrame,
  IconRefresh,
  IconSearch,
  IconUpload,
  IconX,
} from '../../../components/icons';

type Match = {
  photoId: string;
  similarity: number;
  thumbnailUrl: string | null;
  name: string;
};

type DownloadMode = 'mobile-share' | 'mobile-zip' | 'desktop-fsaa' | 'desktop-zip';

export default function EventSearchPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? '';
  const STORAGE_KEY = `fps_event_${code}_search`;

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'sharing' | 'zipping'>('idle');
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<DownloadMode>('desktop-zip');
  const [error, setError] = useState<string | null>(null);

  const thumbUrl = (id: string) => `/api/event/${encodeURIComponent(code)}/photo/${encodeURIComponent(id)}/file?size=thumb`;
  const downloadUrl = (id: string) => `/api/event/${encodeURIComponent(code)}/photo/${encodeURIComponent(id)}/file?dl=1`;
  const zipUrl = `/api/event/${encodeURIComponent(code)}/download-zip`;
  const searchUrl = `/api/event/${encodeURIComponent(code)}/search`;
  const viewUrl = (id: string) => `/event/${encodeURIComponent(code)}/photo/${encodeURIComponent(id)}`;

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
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { matches: Match[]; selected: string[] };
        if (Array.isArray(saved.matches)) setMatches(saved.matches);
        if (Array.isArray(saved.selected)) setSelected(new Set(saved.selected));
      }
    } catch {}
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (matches == null) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ matches, selected: Array.from(selected) }));
    } catch {}
  }, [matches, selected, STORAGE_KEY]);

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
  function selectAll() { if (matches) setSelected(new Set(matches.map((m) => m.photoId))); }
  function clearSel() { setSelected(new Set()); }

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
    const res = await fetch(zipUrl, {
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

  async function downloadSelected() {
    if (selected.size === 0) return;
    setDownloading(true); setError(null); setProgress(0); setPhase('idle');
    const ids = Array.from(selected);
    const nameById = new Map((matches ?? []).map((m) => [m.photoId, m.name]));

    if (ids.length === 1) {
      const id = ids[0];
      anchorDownload(downloadUrl(id), nameById.get(id) ?? `photo-${id}.jpg`);
      setDownloading(false);
      return;
    }

    try {
      if (mode === 'mobile-share') {
        setPhase('fetching');
        const files: File[] = [];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const filename = nameById.get(id) ?? `photo-${id}.jpg`;
          const res = await fetch(downloadUrl(id));
          if (!res.ok) throw new Error(`โหลดล้มเหลว: ${filename}`);
          const blob = await res.blob();
          files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
          setProgress(i + 1);
        }
        setPhase('sharing');
        try {
          if (!(navigator as any).canShare?.({ files })) throw new Error('canShare returned false');
          await (navigator as any).share({ files, title: 'Photos' });
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
          await downloadZip(ids);
        }
      } else {
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

  async function sendForSearch(blob: Blob) {
    setBusy(true);
    setError(null);
    clearResults();
    try {
      const fd = new FormData();
      fd.append('selfie', blob, 'selfie.jpg');
      const res = await fetch(searchUrl, { method: 'POST', body: fd });
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
    <section className="max-w-3xl mx-auto">
      <Link
        href={`/event/${encodeURIComponent(code)}`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand transition"
      >
        <IconArrowLeft className="w-4 h-4" />
        กลับไปดูภาพในงาน
      </Link>

      <div className="mt-4 mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">ค้นหาภาพตัวเอง</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
          ถ่าย selfie หรืออัปโหลดรูปหน้าตรง — ระบบจะคัดเฉพาะภาพที่มีคุณอยู่
        </p>
      </div>

      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/30 dark:bg-neutral-900/40 backdrop-blur p-6 sm:p-8 mb-6">
        {/* Circular camera viewport */}
        <div className="relative mx-auto w-64 h-64 sm:w-80 sm:h-80">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/15 to-brand/5 blur-2xl scale-110" aria-hidden="true" />
          <div className="relative w-full h-full rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 ring-4 ring-white dark:ring-neutral-800 shadow-xl">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity duration-300 ${streaming ? 'opacity-100' : 'opacity-0'}`}
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
            />
            {!streaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 gap-2">
                <IconFaceFrame className="w-24 h-24 stroke-1" />
                <span className="text-xs">กล้องยังไม่เปิด</span>
              </div>
            )}
            {streaming && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 sm:inset-8 rounded-full border-2 border-dashed border-white/70" />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-7 flex flex-col items-center gap-3">
          {!streaming ? (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-medium shadow-sm transition"
              >
                <IconCamera className="w-4 h-4" />
                เปิดกล้อง
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm font-medium transition"
              >
                <IconUpload className="w-4 h-4" />
                อัปโหลดรูป
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={snapAndSearch}
                disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition"
              >
                <IconSearch className="w-4 h-4" />
                {busy ? 'กำลังค้นหา...' : 'ถ่าย & ค้นหา'}
              </button>
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm transition hover:border-neutral-400"
              >
                <IconX className="w-4 h-4" />
                ยกเลิก
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
          <p className="text-[11px] text-neutral-400 text-center max-w-xs">
            จัดให้ใบหน้าอยู่กลางวงกลม หน้าตรง แสงพอดี — ไม่ต้องใส่แว่นกันแดด
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {busy && <SearchSpinner />}

      {matches && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-semibold">ผลลัพธ์</h2>
              <span className="text-sm text-neutral-500">{matches.length} ภาพ</span>
            </div>
            <div className="flex gap-2 text-sm">
              {matches.length > 0 && (
                <>
                  <button
                    onClick={selectAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand transition"
                  >
                    <IconCheck className="w-3.5 h-3.5" />
                    เลือกทั้งหมด
                  </button>
                  {selected.size > 0 && (
                    <button
                      onClick={clearSel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 transition"
                    >
                      <IconX className="w-3.5 h-3.5" />
                      ล้าง ({selected.size})
                    </button>
                  )}
                </>
              )}
              <button
                onClick={clearResults}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-brand hover:border-brand transition"
              >
                <IconRefresh className="w-3.5 h-3.5" />
                ค้นหาใหม่
              </button>
            </div>
          </div>
          {matches.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <IconFaceFrame className="w-12 h-12 mx-auto mb-3 opacity-40" />
              ไม่พบภาพที่ตรงกับใบหน้าของคุณ
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-28">
              {matches.map((m) => {
                const isSel = selected.has(m.photoId);
                return (
                  <div
                    key={m.photoId}
                    className={`group relative rounded-xl overflow-hidden ring-2 transition ${
                      isSel ? 'ring-brand' : 'ring-transparent hover:ring-neutral-300 dark:hover:ring-neutral-700'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggle(m.photoId);
                      }}
                      className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition shadow-sm ${
                        isSel
                          ? 'bg-brand text-white'
                          : 'bg-white/90 dark:bg-neutral-900/90 text-transparent hover:text-neutral-400 ring-1 ring-neutral-300 dark:ring-neutral-700'
                      }`}
                      aria-label="select"
                    >
                      <IconCheck className="w-4 h-4" />
                    </button>
                    <Link href={viewUrl(m.photoId)} className="block">
                      <div className="aspect-square bg-neutral-200 dark:bg-neutral-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl(m.photoId)}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-semibold">
                        {m.similarity}%
                      </div>
                    </Link>
                    <div className="mt-1.5 px-1 text-[11px] text-neutral-500 truncate">{m.name}</div>
                  </div>
                );
              })}
            </div>
          )}
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
                  onClick={downloadSelected}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition"
                >
                  <IconDownload className="w-4 h-4" />
                  {downloading ? 'กำลังโหลด...' : `ดาวน์โหลด`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
