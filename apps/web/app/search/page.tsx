'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';

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
  const [error, setError] = useState<string | null>(null);

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
    setMatches(null);
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
          <h2 className="text-lg font-semibold mb-3">ผลลัพธ์ ({matches.length})</h2>
          {matches.length === 0 ? (
            <div className="text-neutral-500">ไม่พบภาพที่ตรงกับใบหน้าของคุณ</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {matches.map((m) => (
                <Link key={m.photoId} href={`/photo/${m.photoId}`} className="block">
                  <div className="aspect-square rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    {m.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 flex justify-between">
                    <span className="truncate">{m.name}</span>
                    <span className="font-medium text-brand">{m.similarity}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
