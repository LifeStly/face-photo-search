import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const ok = await requireAdmin();
  if (!ok) redirect('/admin/login');
  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">กำลังโหลด...</div>}>
      <AdminPanel />
    </Suspense>
  );
}
