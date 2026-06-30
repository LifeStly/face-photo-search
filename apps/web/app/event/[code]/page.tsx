import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPhotos, getEventCode, latestRunIdForFolder, db } from '@/lib/db';
import { isEventAuthed } from '@/lib/auth';
import EventGrid from './EventGrid';
import FirstVisitTour from '../../components/FirstVisitTour';
import { IconCamera, IconExternal, IconFolderOpen, IconImage } from '../../components/icons';

export const dynamic = 'force-dynamic';

export default async function EventFeedPage({ params }: { params: { code: string } }) {
  const ev = getEventCode(params.code);
  if (!ev) notFound();

  // ถ้า user ยังไม่ผ่าน gate → layout จะ block อยู่แล้ว, ตรงนี้แค่ skip query
  const authed = await isEventAuthed(params.code);
  if (!authed) return null;

  const runId = latestRunIdForFolder(ev.folder_id);
  if (!runId) {
    return (
      <section>
        <h1 className="text-xl font-bold">ไม่มีข้อมูลสำหรับงานนี้</h1>
      </section>
    );
  }

  const folderName = (db()
    .prepare(`SELECT folder_name FROM runs WHERE id=?`)
    .get(runId) as { folder_name: string | null } | undefined)?.folder_name ?? '(ไม่ทราบชื่อ)';

  const photos = listPhotos({ runId, limit: 120 });

  const driveFolderUrl = `https://drive.google.com/drive/folders/${ev.folder_id}`;

  return (
    <section>
      <FirstVisitTour />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{folderName}</h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-neutral-500 mt-1.5">
            <IconImage className="w-4 h-4" />
            {photos.length} ภาพในงาน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm font-medium transition"
            title="เปิด folder บน Google Drive — โหลดทั้งหมด/ดูคุณภาพเต็มได้จากที่นั่น"
          >
            <IconFolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">เปิดใน Google Drive</span>
            <span className="sm:hidden">Drive</span>
            <IconExternal className="w-3 h-3 opacity-60" />
          </a>
          <Link
            href={`/event/${encodeURIComponent(params.code)}/search`}
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
          ยังไม่มีภาพในงานนี้
        </div>
      ) : (
        <EventGrid
          code={params.code}
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
