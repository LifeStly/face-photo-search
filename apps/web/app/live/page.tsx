import Link from 'next/link';
import { listPhotos, activeRun } from '@/lib/db';
import PhotoGrid from '../PhotoGrid';
import FirstVisitTour from '../components/FirstVisitTour';
import { IconCamera, IconExternal, IconFolderOpen, IconImage } from '../components/icons';

export const dynamic = 'force-dynamic';

export default function LiveFeedPage() {
  const run = activeRun();
  const photos = run ? listPhotos({ runId: run.id, limit: 120 }) : [];

  if (!run) {
    return (
      <section className="max-w-3xl mx-auto py-12 text-center">
        <div className="mx-auto mb-5 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600">
          <IconImage className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">ยังไม่มีงาน Live</h1>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          ตอนนี้ยังไม่มี folder ไหนตั้งเป็น Live — ช่างภาพ/admin ต้องเข้าหน้า Admin แล้วเลือก folder งานก่อน
        </p>
      </section>
    );
  }

  const driveFolderUrl = `https://drive.google.com/drive/folders/${run.folder_id}`;
  const folderName = run.folder_name ?? '(งาน Live)';

  return (
    <section>
      <FirstVisitTour />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-[11px] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            LIVE
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{folderName}</h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-neutral-500 mt-1.5">
            <IconImage className="w-4 h-4" />
            {run.processed_photos}/{run.total_photos} ภาพพร้อมค้นหา
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm font-medium transition"
            title="เปิด folder บน Google Drive"
          >
            <IconFolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">เปิดใน Google Drive</span>
            <span className="sm:hidden">Drive</span>
            <IconExternal className="w-3 h-3 opacity-60" />
          </a>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm transition"
          >
            <IconCamera className="w-4 h-4" />
            ค้นหาภาพตัวเอง
          </Link>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <IconImage className="w-12 h-12 mx-auto mb-3 opacity-30" />
          ยังไม่มีภาพ — รอ worker ดึงและ process จาก Google Drive
        </div>
      ) : (
        <PhotoGrid
          storageKey="fps_feed_selected"
          photos={photos.map((p) => ({
            id: p.id,
            name: p.name,
            topLeftBadge: p.pinned_at ? 'PIN' : undefined,
          }))}
        />
      )}
    </section>
  );
}
