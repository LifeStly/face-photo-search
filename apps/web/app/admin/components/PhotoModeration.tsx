'use client';
import { useEffect, useState } from 'react';

type AdminPhoto = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  faceCount: number;
  hidden: boolean;
  pinned: boolean;
  failed: boolean;
  failReason: string | null;
};

export default function PhotoModeration() {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [filter, setFilter] = useState<'all' | 'hidden' | 'failed' | 'pinned'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch('/api/admin/photos?limit=300');
    if (r.ok) {
      const d = await r.json();
      setPhotos(d.photos ?? []);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = photos.filter((p) => {
    if (filter === 'hidden') return p.hidden;
    if (filter === 'failed') return p.failed;
    if (filter === 'pinned') return p.pinned;
    return true;
  });

  async function patch(id: string, body: Partial<{ hidden: boolean; pinned: boolean }>) {
    setBusy(id);
    await fetch(`/api/admin/photos/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    await refresh();
    setBusy(null);
  }

  async function remove(id: string) {
    if (!confirm('ลบภาพนี้ออกจากระบบ? (ภาพต้นฉบับบน Drive ไม่ถูกแตะ)')) return;
    setBusy(id);
    await fetch(`/api/admin/photos/${id}`, { method: 'DELETE' });
    await refresh();
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(['all', 'pinned', 'hidden', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded border ${
              filter === f ? 'bg-brand text-white border-brand' : 'border-neutral-300'
            }`}
          >
            {f === 'all' ? `ทั้งหมด (${photos.length})` :
             f === 'pinned' ? `Pinned (${photos.filter((p) => p.pinned).length})` :
             f === 'hidden' ? `Hidden (${photos.filter((p) => p.hidden).length})` :
             `Failed (${photos.filter((p) => p.failed).length})`}
          </button>
        ))}
        <button onClick={refresh} className="ml-auto px-3 py-1 rounded border">รีเฟรช</button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">ไม่มีภาพในหมวดนี้</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-800 relative">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnailUrl} alt={p.name} className={`w-full h-full object-cover ${p.hidden ? 'opacity-30' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">{p.name}</div>
                )}
                {p.pinned && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-medium">PIN</span>
                )}
                {p.failed && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-medium">FAIL</span>
                )}
              </div>
              <div className="p-2 text-xs">
                <div className="truncate" title={p.name}>{p.name}</div>
                <div className="text-neutral-500">{p.faceCount} หน้า</div>
                {p.failed && p.failReason && (
                  <div className="text-red-500 mt-1 line-clamp-2" title={p.failReason}>{p.failReason}</div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  <button
                    disabled={busy === p.id}
                    onClick={() => patch(p.id, { pinned: !p.pinned })}
                    className="px-2 py-0.5 rounded border text-[11px] disabled:opacity-50"
                  >
                    {p.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => patch(p.id, { hidden: !p.hidden })}
                    className="px-2 py-0.5 rounded border text-[11px] disabled:opacity-50"
                  >
                    {p.hidden ? 'แสดง' : 'ซ่อน'}
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => remove(p.id)}
                    className="px-2 py-0.5 rounded border border-red-300 text-red-600 text-[11px] disabled:opacity-50"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
