'use client';
import { useEffect, useState } from 'react';

type Info = {
  code: string;
  folderName: string;
  hasPassword: boolean;
  authed: boolean;
};

export default function EventGate({ code, children }: { code: string; children: React.ReactNode }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/event/${encodeURIComponent(code)}/info`);
    if (!r.ok) {
      setInfo({ code, folderName: '(ไม่พบ)', hasPassword: false, authed: false });
      return;
    }
    const d = await r.json();
    setInfo(d);

    // public event → auto-authenticate
    if (!d.hasPassword && !d.authed) {
      const ar = await fetch(`/api/event/${encodeURIComponent(code)}/auth`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (ar.ok) setInfo({ ...d, authed: true });
    }
  }

  useEffect(() => { load(); }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/event/${encodeURIComponent(code)}/auth`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'รหัสไม่ถูกต้อง');
      setInfo((cur) => (cur ? { ...cur, authed: true } : null));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!info) {
    return <div className="p-8 text-center text-neutral-500">กำลังโหลด...</div>;
  }

  if (info.authed) {
    return <>{children}</>;
  }

  if (!info.hasPassword) {
    // ยังไม่ auto-auth — แสดง loading
    return <div className="p-8 text-center text-neutral-500">กำลังเข้าสู่งาน...</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <h1 className="text-xl font-bold mb-1">🔒 {info.folderName}</h1>
      <p className="text-sm text-neutral-500 mb-4">งานนี้ต้องใส่รหัสผ่าน</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน"
          autoFocus
          className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full px-4 py-2 rounded bg-brand text-white font-medium disabled:opacity-50"
        >
          {submitting ? 'กำลังตรวจ...' : 'เข้างาน'}
        </button>
      </form>
    </div>
  );
}
