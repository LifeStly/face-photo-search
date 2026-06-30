import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPhoto } from '@/lib/db';
import { IconArrowLeft, IconDownload, IconExternal } from '../../components/icons';

export const dynamic = 'force-dynamic';

export default function PhotoPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const photo = getPhoto(id);
  if (!photo) notFound();

  const fileApi = `/api/photos/${encodeURIComponent(id)}/file`;
  const downloadApi = `${fileApi}?dl=1`;
  const viewUrl = photo.view_url ?? `https://drive.google.com/file/d/${photo.drive_file_id}/view`;

  return (
    <section className="max-w-4xl mx-auto">
      <Link href="/live" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand transition">
        <IconArrowLeft className="w-4 h-4" />
        กลับ Feed
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
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm transition"
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
