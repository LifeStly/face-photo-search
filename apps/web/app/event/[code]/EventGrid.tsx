'use client';
import PhotoGrid, { type GridPhoto, type PhotoUrls } from '../../PhotoGrid';

export default function EventGrid({ code, photos }: { code: string; photos: GridPhoto[] }) {
  const urls: PhotoUrls = {
    thumb: (id) => `/api/event/${encodeURIComponent(code)}/photo/${encodeURIComponent(id)}/file?size=thumb`,
    download: (id) => `/api/event/${encodeURIComponent(code)}/photo/${encodeURIComponent(id)}/file?dl=1`,
    zip: `/api/event/${encodeURIComponent(code)}/download-zip`,
    view: (id) => `/event/${encodeURIComponent(code)}/photo/${encodeURIComponent(id)}`,
  };
  return <PhotoGrid photos={photos} storageKey={`fps_event_${code}_feed`} urls={urls} />;
}
