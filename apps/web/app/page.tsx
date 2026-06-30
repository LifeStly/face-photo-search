import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { IconCamera, IconChevronRight, IconImage, IconQR, IconShield, IconSparkles } from './components/icons';

export const dynamic = 'force-dynamic';

export default function WelcomePage() {
  const settings = getSettings();

  return (
    <section className="py-8 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white mb-5 shadow-lg shadow-brand/30">
          <IconSparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">{settings.appName}</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          {settings.welcomeMessage || 'ถ่าย selfie แล้วเจอภาพตัวเองจากงานได้ทันที'}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4">
        <Card icon={<IconQR className="w-5 h-5" />} title="มาจากการสแกน QR code?">
          สแกน QR ที่ได้รับจากช่างภาพ/ผู้จัดงาน เพื่อเข้าหน้าของงานนั้นโดยตรง — ค้นหาภาพตัวเองได้ทันที
        </Card>

        <Card icon={<IconCamera className="w-5 h-5" />} title="วิธีใช้งาน">
          <ol className="space-y-1.5 text-sm leading-relaxed">
            <Step n={1}>สแกน QR ของงานที่ได้รับ</Step>
            <Step n={2}>กด &quot;ค้นหาภาพตัวเอง&quot; แล้วถ่าย selfie หรืออัปโหลดรูป</Step>
            <Step n={3}>ระบบจะแสดงภาพที่มีหน้าคุณ พร้อม % ความเหมือน</Step>
            <Step n={4}>เลือกภาพที่ต้องการ → ดาวน์โหลด</Step>
          </ol>
        </Card>

        <Card icon={<IconShield className="w-5 h-5" />} title="สำหรับช่างภาพ / ผู้จัดงาน">
          <p className="mb-4">จัดการ folder งาน ตั้งค่าระบบ และสร้าง QR ให้ผู้ใช้สแกน</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-medium transition"
            >
              เข้าหน้า Admin
              <IconChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/live"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm transition"
            >
              <IconImage className="w-3.5 h-3.5" />
              ดูงาน Live ปัจจุบัน
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-brand hover:text-brand text-sm transition"
            >
              คู่มือการใช้งาน
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 backdrop-blur p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand/10 text-brand">{icon}</span>
        <h2 className="font-semibold text-base">{title}</h2>
      </div>
      <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex-none inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
