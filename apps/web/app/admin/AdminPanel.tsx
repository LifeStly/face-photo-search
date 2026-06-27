'use client';
import { useState } from 'react';
import RunControl from './components/RunControl';
import PhotoModeration from './components/PhotoModeration';
import DriveBrowser from './components/DriveBrowser';
import Branding from './components/Branding';

type Tab = 'run' | 'photos' | 'drive' | 'branding';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'run', label: 'ควบคุมงาน' },
  { key: 'photos', label: 'จัดการภาพ' },
  { key: 'drive', label: 'Drive' },
  { key: 'branding', label: 'ตั้งค่าหน้าเว็บ' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('run');

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    location.href = '/admin/login';
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button onClick={logout} className="text-sm text-neutral-500 hover:text-brand">ออกจากระบบ</button>
      </div>

      <div className="border-b border-neutral-200 dark:border-neutral-800 mb-6 -mx-4 px-4 overflow-x-auto">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t.key
                  ? 'border-brand text-brand font-medium'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-brand'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'run' && <RunControl />}
      {tab === 'photos' && <PhotoModeration />}
      {tab === 'drive' && <DriveBrowser />}
      {tab === 'branding' && <Branding />}
    </section>
  );
}
