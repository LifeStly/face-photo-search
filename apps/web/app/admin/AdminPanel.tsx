'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RunControl from './components/RunControl';
import PhotoModeration from './components/PhotoModeration';
import DriveBrowser from './components/DriveBrowser';
import Branding from './components/Branding';
import SetupTab from './components/SetupTab';
import PublicAccessBanner from './components/PublicAccessBanner';

type Tab = 'folders' | 'photos' | 'settings';

const TAB_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  folders: { title: 'Folders', subtitle: 'จัดการ folder งาน · เริ่ม Live / Archive · QR code' },
  photos: { title: 'ภาพ & งาน', subtitle: 'ดูสถานะ Live · ซ่อน/pin/ลบภาพ' },
  settings: { title: 'ตั้งค่า', subtitle: 'หน้าตาเว็บ · Public URL · Service Account' },
};

export default function AdminPanel() {
  const sp = useSearchParams();
  const raw = sp?.get('tab') ?? 'folders';
  const tab: Tab = raw === 'photos' || raw === 'settings' ? raw : 'folders';
  const meta = TAB_TITLES[tab];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{meta.subtitle}</p>
        </div>
        <Link href="/help" className="text-sm text-neutral-500 hover:text-brand inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-[10px]">?</span>
          คู่มือ
        </Link>
      </div>

      <PublicAccessBanner />

      {tab === 'folders' && <DriveBrowser />}

      {tab === 'photos' && (
        <div className="space-y-6">
          <RunControl />
          <PhotoModeration />
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
          <Branding />
          <SetupTab />
        </div>
      )}
    </section>
  );
}
