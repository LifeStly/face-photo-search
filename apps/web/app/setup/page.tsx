'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Status = { complete: boolean; hasServiceAccount: boolean; hasPassword: boolean; driveFolderId?: string; driveFolderName?: string };
type Folder = { id: string; name: string };

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [step, setStep] = useState(1);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [folderId, setFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [manualLink, setManualLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/setup/status').then((r) => r.json()).then((s: Status) => {
      setStatus(s);
      if (s.hasServiceAccount) setStep((p) => Math.max(p, 2));
      if (s.hasPassword) setStep((p) => Math.max(p, 3));
      if (s.driveFolderId) {
        setFolderId(s.driveFolderId);
        setFolderName(s.driveFolderName ?? '');
        setStep(4);
      }
    });
  }, []);

  async function uploadServiceAccount(file: File) {
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/setup/service-account', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'upload failed');
      setServiceAccountEmail(d.clientEmail);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/setup/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'save failed');
      setStep(3);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  async function loginAndLoadFolders() {
    setBusy(true); setError(null);
    try {
      const lr = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!lr.ok) throw new Error('รหัสผ่านยังไม่ถูกบันทึก ลองรีเฟรชหน้า');
      const r = await fetch('/api/admin/folders');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'list folders failed');
      setFolders(d.folders ?? []);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  async function saveFolder(id: string, name: string) {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/setup/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driveFolderId: id, driveFolderName: name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'save failed');
      setFolderId(id); setFolderName(name);
      setStep(4);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  function parseFolderLink(url: string): string | null {
    const m = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();
    return null;
  }

  return (
    <section className="max-w-2xl mx-auto py-8">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-bold">ตั้งค่าเริ่มต้น</h1>
        <Link href="/help?topic=setup-first-time" className="text-sm text-neutral-500 hover:text-brand inline-flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs">?</span>
          คู่มือ
        </Link>
      </div>
      <p className="text-neutral-500 mb-8">3 ขั้นตอนเสร็จในไม่กี่นาที</p>

      <Step n={1} title="ใส่ Google Service Account" active={step === 1} done={!!status?.hasServiceAccount || !!serviceAccountEmail}>
        <p className="text-sm mb-3">
          1) ไป <a className="text-brand underline" href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer">Google Cloud Console</a> สร้าง service account, enable Drive API<br/>
          2) สร้าง JSON key ดาวน์โหลดมา<br/>
          3) ลากไฟล์มาวางด้านล่าง (หรือคลิกเลือก)
        </p>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && uploadServiceAccount(e.target.files[0])} />
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadServiceAccount(f); }}
          className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center cursor-pointer hover:border-brand"
        >
          {busy ? 'กำลังตรวจสอบ...' : 'ลาก service-account.json มาวางที่นี่ หรือคลิกเลือกไฟล์'}
        </div>
        {serviceAccountEmail && (
          <div className="mt-3 p-3 rounded bg-green-100 text-green-800 text-sm">
            ✓ บันทึกแล้ว: <span className="font-mono">{serviceAccountEmail}</span><br/>
            <span className="text-xs">⚠ อย่าลืม "share" Drive folder ที่จะใช้ ให้กับ email นี้ (สิทธิ์ Viewer ก็พอ)</span>
          </div>
        )}
      </Step>

      <Step n={2} title="ตั้งรหัสผ่าน Admin" active={step === 2} done={!!status?.hasPassword || step > 2}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่านขั้นต่ำ 4 ตัวอักษร"
          className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        />
        <button onClick={savePassword} disabled={busy || password.length < 4} className="mt-3 px-4 py-2 rounded bg-brand text-white disabled:opacity-50">
          {busy ? 'บันทึก...' : 'บันทึกรหัส'}
        </button>
      </Step>

      <Step n={3} title="เลือก Drive Folder" active={step === 3} done={!!folderId}>
        {!folders ? (
          <button onClick={loginAndLoadFolders} disabled={busy} className="px-4 py-2 rounded bg-brand text-white disabled:opacity-50">
            {busy ? 'กำลังโหลด...' : 'ดู Folder ที่ Service Account เข้าได้'}
          </button>
        ) : (
          <>
            {folders.length === 0 ? (
              <div className="text-sm text-neutral-500 mb-3">
                ไม่มี folder ที่ service account เห็น — แชร์ folder ใน Drive ให้ email ของ service account ก่อน
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4 border rounded p-2">
                {folders.map((f) => (
                  <button key={f.id} onClick={() => saveFolder(f.id, f.name)} disabled={busy} className="w-full text-left px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    📁 {f.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">หรือ paste ลิงก์ folder Drive</div>
              <div className="flex gap-2">
                <input value={manualLink} onChange={(e) => setManualLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="flex-1 px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
                <button
                  onClick={() => {
                    const id = parseFolderLink(manualLink);
                    if (!id) { setError('ลิงก์ไม่ถูกต้อง'); return; }
                    saveFolder(id, '');
                  }}
                  disabled={busy}
                  className="px-4 py-2 rounded border"
                >ใช้</button>
              </div>
            </div>
          </>
        )}
      </Step>

      <Step n={4} title="พร้อมใช้งาน" active={step === 4} done={step === 4 && !!folderId}>
        <div className="text-sm space-y-2">
          <div>✓ Service account: <span className="font-mono text-xs">{serviceAccountEmail ?? 'พร้อม'}</span></div>
          <div>✓ Admin password: ตั้งแล้ว</div>
          <div>✓ Drive folder: <span className="font-mono">{folderName || folderId}</span></div>
        </div>
        <button onClick={() => router.push('/admin/login')} className="mt-4 px-6 py-3 rounded bg-brand text-white font-medium">
          ไปหน้า Admin →
        </button>
      </Step>

      {error && <div className="fixed bottom-4 right-4 max-w-md p-3 rounded bg-red-100 text-red-800 text-sm shadow-lg">{error}</div>}
    </section>
  );
}

function Step({ n, title, active, done, children }: { n: number; title: string; active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <div className={`mb-6 p-5 rounded-xl border ${active ? 'border-brand' : done ? 'border-green-300' : 'border-neutral-200 dark:border-neutral-800'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${done ? 'bg-green-500 text-white' : active ? 'bg-brand text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
          {done ? '✓' : n}
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className={done && !active ? 'opacity-60' : ''}>{children}</div>
    </div>
  );
}
