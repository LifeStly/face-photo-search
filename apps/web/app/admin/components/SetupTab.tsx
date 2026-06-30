'use client';
import { useEffect, useRef, useState } from 'react';
import HelpButton from '../../components/HelpButton';

type Step = 'view' | 'warn' | 'upload' | 'done';

export default function SetupTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('view');
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadCurrent() {
    try {
      const r = await fetch('/api/admin/service-account');
      const d = await r.json();
      setCurrentEmail(d.email ?? null);
    } catch {
      setCurrentEmail(null);
    }
  }
  useEffect(() => { loadCurrent(); }, []);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/setup/service-account', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'upload failed');
      setNewEmail(d.clientEmail);
      setStep('done');
      await loadCurrent();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function reset() {
    setStep('view');
    setNewEmail(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">ตั้งค่า Service Account</h2>
          <HelpButton topic="reset-sa" />
        </div>
        <p className="text-sm text-neutral-500 mt-1">
          เปลี่ยน service account ที่แอปใช้คุยกับ Google Drive — ใช้เพื่อ
          &ldquo;เริ่มต้นใหม่หมด&rdquo; ตอนมี folder ค้างเยอะ
        </p>
      </div>

      {/* ---- ขั้น VIEW ---- */}
      {step === 'view' && (
        <>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
              Service Account ปัจจุบัน
            </div>
            {currentEmail ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-0 px-2 py-1.5 rounded bg-neutral-50 dark:bg-neutral-900 border text-xs break-all">
                  {currentEmail}
                </code>
                <button
                  onClick={() => copyEmail(currentEmail)}
                  className="px-3 py-1.5 rounded border text-xs font-medium whitespace-nowrap"
                >
                  {copied ? '✓' : 'คัดลอก'}
                </button>
              </div>
            ) : (
              <div className="text-sm text-neutral-500">กำลังโหลด...</div>
            )}
          </div>

          <button
            onClick={() => setStep('warn')}
            className="px-4 py-2 rounded border border-amber-500 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            🔄 เปลี่ยน Service Account
          </button>

          <details className="text-sm text-neutral-500">
            <summary className="cursor-pointer hover:text-brand">เปลี่ยนเมื่อไหร่?</summary>
            <div className="mt-2 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-2">
              <p>
                ทุก folder ที่เคยแชร์ให้ SA อันเก่า — ค้างอยู่ใน &ldquo;Shared with me&rdquo; ของ SA ตลอด
                ถึงแม้คุณกด &ldquo;ลบ folder&rdquo; ใน Drive tab ไปแล้ว
              </p>
              <p>
                ถ้ามี folder ค้างเยอะมาก (หลายร้อย/หลายพัน) จะทำให้ list ช้าและรกลิสต์
              </p>
              <p>
                <strong>วิธีรีเซ็ตเกลี้ยง:</strong> สร้าง SA ใหม่ใน Google Cloud Console (email
                ต่างจากเดิม) → upload ไฟล์ .json ที่นี่ → ของเก่าทั้งหมดหายจาก view ของแอป
              </p>
            </div>
          </details>
        </>
      )}

      {/* ---- ขั้น WARN ---- */}
      {step === 'warn' && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="font-semibold text-amber-900 dark:text-amber-200">
            ⚠️ ก่อนเปลี่ยน — โปรดอ่าน
          </div>
          <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1.5 list-disc list-inside">
            <li><strong>folder ที่เคยแชร์ให้ SA เก่าจะหายจาก view ของแอป</strong> — ต้อง share folder ทุกอันใหม่ให้ email ใหม่</li>
            <li>ข้อมูลใน DB (photos, embeddings, QR codes) <strong>ไม่ถูกลบ</strong> — งานเก่าที่ sync ไว้ + QR ของแขกที่กระจายไปแล้ว ใช้งานได้ปกติ</li>
            <li>Live folder ปัจจุบัน (ถ้ามี) — SA ใหม่จะ access folder ไม่ได้ → sync ล้มเหลวเงียบๆ → ต้อง share folder นั้นให้ email ใหม่ก่อน</li>
          </ul>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep('upload')} className="px-4 py-2 rounded bg-amber-500 text-white text-sm font-medium">
              เข้าใจแล้ว ดำเนินการต่อ
            </button>
            <button onClick={() => setStep('view')} className="px-4 py-2 rounded border text-sm">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* ---- ขั้น UPLOAD ---- */}
      {step === 'upload' && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <div className="font-medium">เลือกไฟล์ Service Account JSON ใหม่</div>

          <ol className="text-sm text-neutral-600 dark:text-neutral-400 list-decimal list-inside space-y-1">
            <li>เปิด <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand underline">Google Cloud Console</a></li>
            <li>IAM &amp; Admin → Service Accounts</li>
            <li>(ถ้าต้องการ email ใหม่) สร้าง SA ใหม่ + Enable Drive API</li>
            <li>เลือก SA → tab KEYS → ADD KEY → Create new key → JSON</li>
            <li>ไฟล์ <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1">*.json</code> จะถูกดาวน์โหลด — เลือกตรงนี้:</li>
          </ol>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
            disabled={uploading}
            className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded file:border-0 file:bg-brand file:text-white file:font-medium hover:file:bg-brand/90"
          />

          {error && <div className="text-sm text-red-600 p-2 rounded bg-red-50 dark:bg-red-950/30">{error}</div>}
          {uploading && <div className="text-sm text-neutral-500">กำลังอัพโหลด...</div>}

          <button onClick={() => setStep('view')} disabled={uploading} className="text-sm text-neutral-500 hover:text-brand">
            ← ยกเลิก
          </button>
        </div>
      )}

      {/* ---- ขั้น DONE ---- */}
      {step === 'done' && newEmail && (
        <div className="rounded-xl border-2 border-green-400 bg-green-50 dark:bg-green-950/30 p-4 space-y-3">
          <div className="font-semibold text-green-900 dark:text-green-200">
            ✅ เปลี่ยน Service Account เรียบร้อย
          </div>

          <div>
            <div className="text-xs text-green-800 dark:text-green-300 mb-1.5">Email ใหม่ (ใช้แชร์ folder ให้):</div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 px-2 py-1.5 rounded bg-white dark:bg-neutral-900 border text-xs break-all">
                {newEmail}
              </code>
              <button
                onClick={() => copyEmail(newEmail)}
                className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-medium whitespace-nowrap"
              >
                {copied ? '✓ คัดลอก' : 'คัดลอก'}
              </button>
            </div>
          </div>

          <div className="border-l-4 border-green-500 pl-3 text-sm text-green-900 dark:text-green-100 space-y-1">
            <div className="font-medium">ขั้นต่อไป:</div>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>เปิด Google Drive → คลิกขวา folder งาน → Share</li>
              <li>วาง email ใหม่ → ตั้ง Viewer → Send</li>
              <li>กลับมาที่ tab Drive → กดรีเฟรช → folder จะโผล่</li>
            </ol>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={reset} className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium">
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
