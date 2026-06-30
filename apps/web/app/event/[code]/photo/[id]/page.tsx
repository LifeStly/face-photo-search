import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPhoto, getEventCode, latestRunIdForFolder } from '@/lib/db';
import { photoBelongsToEvent } from '@/lib/event';
import { IconArrowLeft, IconDownload, IconExternal } from '../../../../components/icons';

export const dynamic = 'force-dynamic';

export default function EventPhotoPage({ params }: { params: { code: string; id: string } }) {
  const ev = getEventCode(params.code);
  if (!ev) notFound();
  const runId = latestRunIdForFolder(ev.folder_id);
  if (!runId) notFound();

  const id = decodeURIComponent(params.id);
  if (!photoBelongsToEvent(id, runId)) notFound();

  const photo = getPhoto(id);
  if (!photo) notFound();

  const code = encodeURIComponent(params.code);
  const fileApi = `/api/event/${code}/photo/${encodeURIComponent(id)}/file`;
  const downloadApi = `${fileApi}?dl=1`;
  const driveViewUrl = photo.view_url ?? `https://drive.google.com/file/d/${photo.drive_file_id}/view`;

  return (
    <section className="max-w-4xl mx-auto">
      <Link
        href={`/event/${code}`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand transition"
      >
        <IconArrowLeft className="w-4 h-4" />
        กลับ
      </Link>
      <div className="mt-4 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileApi} alt={photo.name} className="w-full max-h-[80vh] object-contain" />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{photo.name}</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {photo.face_count} ใบหน้า{photo.width && photo.height ? ` · ${photo.width}×${photo.height}` : ''}
          </div>
        </div>
        <a
          href={driveViewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm transition"
          title="เปิดดูภาพต้นฉบับใน Google Drive"
        >
          <span>เปิดใน Drive</span>
          <IconExternal className="w-3.5 h-3.5 opacity-70" />
        </a>
        <a
          href={downloadApi}
          download={photo.name}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-medium shadow-sm transition"
        >
          <IconDownload className="w-4 h-4" />
          ดาวน์โหลด
        </a>
      </div>
    </section>
  );
}
