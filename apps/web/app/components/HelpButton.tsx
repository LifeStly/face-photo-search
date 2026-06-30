'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getHelpTopic } from '@/lib/help-content';

export default function HelpButton({
  topic,
  label,
  variant = 'icon',
}: {
  topic: string;
  label?: string;
  variant?: 'icon' | 'link';
}) {
  const [open, setOpen] = useState(false);
  const t = getHelpTopic(topic);
  if (!t) return null;

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setOpen(true)}
          title={`ช่วยเหลือ: ${t.title}`}
          aria-label={`ช่วยเหลือ: ${t.title}`}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 hover:text-brand hover:border-brand transition"
        >
          ?
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-neutral-500 hover:text-brand inline-flex items-center gap-1"
        >
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current text-[10px]">?</span>
          {label ?? t.title}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{t.icon}</span>
                <h2 className="font-semibold">{t.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/help?topic=${t.id}`}
                  onClick={() => setOpen(false)}
                  className="text-xs text-neutral-500 hover:text-brand"
                >
                  เปิดหน้าเต็ม →
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-5 prose-help">
              {t.content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
