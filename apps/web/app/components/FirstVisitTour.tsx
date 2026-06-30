'use client';
import { useEffect, useState } from 'react';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconDownload,
  IconSparkles,
  IconX,
} from './icons';

const TOUR_KEY = 'fps_event_tour_v1';

type Step = { Icon: (p: any) => JSX.Element; title: string; body: string };

const STEPS: Step[] = [
  {
    Icon: IconSparkles,
    title: 'ยินดีต้อนรับ',
    body: 'หน้านี้รวมภาพทั้งหมดของงาน — เลื่อนดูภาพ หรือใช้ระบบจดจำใบหน้าค้นหารูปตัวเองได้ทันที',
  },
  {
    Icon: IconCamera,
    title: 'ค้นหาภาพตัวเองด้วย selfie',
    body: 'กดปุ่ม "ค้นหาภาพตัวเอง" → เปิดกล้องถ่าย selfie หรืออัปโหลดรูปหน้าตรง ระบบจะคัดเฉพาะรูปที่มีคุณ พร้อมบอก % ความเหมือน',
  },
  {
    Icon: IconCheck,
    title: 'เลือกหลายภาพในคราวเดียว',
    body: 'แตะวงกลมที่มุมซ้ายบนของแต่ละรูปเพื่อเลือก — เลือกได้หลายภาพพร้อมกัน เลือกครบแล้วกดปุ่มดาวน์โหลดด้านล่าง',
  },
  {
    Icon: IconDownload,
    title: 'ดาวน์โหลดง่ายๆ',
    body: 'มือถือ: เปิดเมนูแชร์ → "บันทึกรูปภาพ" ลงแกลเลอรีทั้งหมดครั้งเดียว · คอมพิวเตอร์: รวมเป็นไฟล์ ZIP ไฟล์เดียว',
  },
];

export default function FirstVisitTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        setOpen(true);
      }
    } catch {}
  }, []);

  function close() {
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {}
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.Icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div
        className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="ปิด"
          className="absolute top-3 right-3 w-8 h-8 rounded-full inline-flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <IconX className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/30">
            <Icon className="w-8 h-8" />
          </div>
          <h2 id="tour-title" className="text-xl font-bold mb-2 tracking-tight">
            {s.title}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{s.body}</p>
        </div>

        <div className="flex justify-center gap-1.5 my-5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-brand' : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          {step > 0 && (
            <button
              onClick={() => setStep((x) => x - 1)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:border-neutral-400 transition"
            >
              <IconArrowLeft className="w-4 h-4" />
              ย้อนกลับ
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setStep((x) => x + 1)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition"
            >
              ถัดไป
              <IconArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={close}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition"
            >
              เริ่มใช้งาน
            </button>
          )}
        </div>

        <button
          onClick={close}
          className="block mx-auto mt-3 text-xs text-neutral-500 hover:text-brand transition"
        >
          ข้ามทัวร์ ({step + 1}/{STEPS.length})
        </button>
      </div>
    </div>
  );
}
