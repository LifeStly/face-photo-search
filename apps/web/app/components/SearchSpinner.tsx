'use client';
import { useEffect, useState } from 'react';
import { IconCheck, IconSearch } from './icons';

const STEPS = [
  'อัปโหลดรูป selfie',
  'ตรวจจับใบหน้า',
  'เปรียบเทียบกับภาพในงาน',
  'รวบรวมผลลัพธ์',
];

export default function SearchSpinner() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % STEPS.length);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 px-6 py-10 flex flex-col items-center gap-5 bg-white/40 dark:bg-neutral-900/40"
    >
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-brand/15" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-brand">
          <IconSearch className="w-9 h-9" />
        </div>
        <div
          className="absolute left-3 right-3 top-1/2 h-[2px] bg-brand/70 rounded-full pointer-events-none animate-scan-line"
          aria-hidden="true"
        />
      </div>

      <div className="text-center">
        <div className="font-semibold text-base">กำลังค้นหาภาพของคุณ</div>
        <div className="text-sm text-brand mt-0.5 min-h-[1.25rem]">{STEPS[active]}…</div>
      </div>

      <div className="w-full max-w-xs h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div className="h-full rounded-full bg-brand animate-indeterminate" />
      </div>

      <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1 w-full max-w-xs">
        {STEPS.map((s, i) => {
          const done = i < active;
          const cur = i === active;
          return (
            <li
              key={i}
              className={`flex items-center gap-2 transition-colors ${
                cur ? 'text-brand font-medium' : done ? 'text-neutral-400 dark:text-neutral-500 line-through' : ''
              }`}
            >
              <span className="w-4 inline-flex justify-center items-center">
                {done ? (
                  <IconCheck className="w-3.5 h-3.5" />
                ) : cur ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-brand animate-pulse" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full border border-current opacity-50" />
                )}
              </span>
              <span>{s}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center max-w-xs">
        ใช้เวลาประมาณ 5-10 วินาที กรุณาอย่าปิดหน้านี้
      </p>
    </div>
  );
}
