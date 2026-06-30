import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth';
import { config } from '@/lib/config';
import SuperPanel from './SuperPanel';

export const dynamic = 'force-dynamic';

export default async function SuperPage() {
  if (config.app.mode !== 'saas') {
    return (
      <section className="max-w-md mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-3">ไม่ใช่ SaaS mode</h1>
        <p className="text-neutral-500">หน้านี้มีเฉพาะตอนรันด้วย <code>APP_MODE=saas</code></p>
      </section>
    );
  }
  if (!(await requireSuperAdmin())) {
    redirect('/admin/login');
  }
  return <SuperPanel />;
}
