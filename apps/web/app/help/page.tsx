import Link from 'next/link';
import { HELP_TOPICS } from '@/lib/help-content';

export const dynamic = 'force-dynamic';

export default function HelpPage({ searchParams }: { searchParams: { topic?: string } }) {
  const activeId = searchParams.topic ?? HELP_TOPICS[0].id;
  const active = HELP_TOPICS.find((t) => t.id === activeId) ?? HELP_TOPICS[0];

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">คู่มือการใช้งาน</h1>
        <p className="text-sm text-neutral-500 mt-1">เลือกหัวข้อจากเมนูด้านซ้าย</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-1">
          {HELP_TOPICS.map((t) => {
            const isActive = t.id === active.id;
            return (
              <Link
                key={t.id}
                href={`/help?topic=${t.id}`}
                className={`block px-3 py-2 rounded text-sm transition ${
                  isActive
                    ? 'bg-brand text-white'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <span className="mr-2">{t.icon}</span>
                {t.title}
              </Link>
            );
          })}
        </aside>

        {/* Content */}
        <article className="min-w-0">
          <div className="mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="text-3xl mb-1">{active.icon}</div>
            <h2 className="text-xl font-bold">{active.title}</h2>
            <p className="text-sm text-neutral-500 mt-1">{active.summary}</p>
          </div>
          <div className="prose-help">{active.content}</div>
        </article>
      </div>
    </section>
  );
}
