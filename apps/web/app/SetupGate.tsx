'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function SetupGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    // skip gate สำหรับ /setup (ตัว wizard) และ /event/* (guest scan QR ไม่ควรเด้ง /setup)
    // ถ้าระบบยังไม่ setup และ guest scan QR เข้ามา — ก็ไม่มีข้อมูลให้แสดงอยู่ดี, event page จะแสดง "invalid code"
    if (pathname?.startsWith('/setup') || pathname?.startsWith('/event/')) { setOk(true); return; }
    fetch('/api/setup/status').then((r) => r.json()).then((s: { complete: boolean }) => {
      if (!s.complete) {
        router.replace('/setup');
      } else {
        setOk(true);
      }
    }).catch(() => setOk(true));
  }, [pathname, router]);

  if (ok === null) return <div className="text-center py-20 text-neutral-500 text-sm">กำลังโหลด...</div>;
  return <>{children}</>;
}
