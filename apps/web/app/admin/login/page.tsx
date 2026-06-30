'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'portable' | 'saas' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/setup/status').then(r => r.json()).then(s => setMode(s.mode ?? 'portable'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = mode === 'saas' ? { username, password } : { password };
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'login failed');
      // saas + super → /super, otherwise → /admin
      if (mode === 'saas' && d.role === 'super') {
        router.push('/super');
      } else {
        router.push('/admin');
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {mode === 'saas' ? 'เข้าสู่ระบบ' : 'Admin Login'}
      </h1>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'saas' && (
          <input
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-900"
            autoComplete="username"
          />
        )}
        <input
          type="password"
          autoFocus={mode !== 'saas'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'saas' ? 'รหัสผ่าน' : 'รหัสผ่าน admin'}
          className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-900"
          autoComplete="current-password"
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button disabled={busy} className="w-full py-2 rounded bg-brand text-white disabled:opacity-50">
          {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </section>
  );
}
