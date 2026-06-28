import Link from 'next/link';
import { listPhotos, activeRun } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import PhotoGrid from './PhotoGrid';

export const dynamic = 'force-dynamic';

export default function FeedPage({ searchParams }: { searchParams: { groups?: string } }) {
  const photos = listPhotos({ limit: 120 });
  const run = activeRun();
  const settings = getSettings();
  const onlyGroups = searchParams.groups === '1';
  const filtered = onlyGroups ? photos.filter((p) => p.face_count >= 3) : photos;

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{settings.appName}</h1>
        {settings.welcomeMessage && (
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">{settings.welcomeMessage}</p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Feed</h2>
          {run ? (
            <p className="text-sm text-neutral-500">
              งาน: <span className="font-medium">{run.folder_name ?? run.folder_id}</span> · ภาพที่ process แล้ว {run.processed_photos}/{run.total_photos}
            </p>
          ) : (
            <p className="text-sm text-amber-600">ยังไม่มีงานที่กำลังรัน — admin ต้องเข้าไปเลือก folder งานก่อน</p>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/" className={`px-3 py-1 rounded border ${!onlyGroups ? 'bg-brand text-white border-brand' : 'border-neutral-300'}`}>ทั้งหมด</Link>
          <Link href="/?groups=1" className={`px-3 py-1 rounded border ${onlyGroups ? 'bg-brand text-white border-brand' : 'border-neutral-300'}`}>ภาพหมู่</Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          ยังไม่มีภาพ — รอ worker ดึงและ process จาก Google Drive
        </div>
      ) : (
        <PhotoGrid
          storageKey="fps_feed_selected"
          photos={filtered.map((p) => ({
            id: p.id,
            name: p.name,
            topLeftBadge: p.pinned_at ? 'PIN' : undefined,
          }))}
        />
      )}
    </section>
  );
}
