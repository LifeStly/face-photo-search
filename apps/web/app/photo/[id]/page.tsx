import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPhoto } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function PhotoPage({ params }: { params: { id: string } }) {
  const photo = getPhoto(params.id);
  if (!photo) notFound();

  const downloadUrl = photo.download_url ?? `https://drive.google.com/uc?export=download&id=${photo.drive_file_id}`;
  const viewUrl = photo.view_url ?? `https://drive.google.com/file/d/${photo.drive_file_id}/view`;
  const fullUrl = `https://drive.google.com/uc?export=view&id=${photo.drive_file_id}`;

  return (
    <section>
      <Link href="/" className="text-sm text-neutral-500 hover:text-brand">&larr; กลับ Feed</Link>
      <div className="mt-4 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fullUrl} alt={photo.name} className="w-full max-h-[80vh] object-contain" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{photo.name}</div>
          <div className="text-xs text-neutral-500">
            {photo.face_count} ใบหน้า · {photo.width && photo.height ? `${photo.width}×${photo.height}` : ''}
          </div>
        </div>
        <a href={downloadUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded bg-brand text-white">ดาวน์โหลด</a>
        <a href={viewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded border">เปิดใน Drive</a>
      </div>
    </section>
  );
}
