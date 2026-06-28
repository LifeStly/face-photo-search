import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import SetupGate from './SetupGate';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const s = getSettings();
  return {
    title: s.appName,
    description: s.welcomeMessage,
  };
}

function darken(hex: string, amount = 0.2): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const s = getSettings();
  const themeVars = `:root { --brand: ${s.brandColor}; --brand-dark: ${darken(s.brandColor, 0.2)}; }`;

  return (
    <html lang="th">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body>
        <header className="sticky top-0 z-30 border-b border-neutral-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-brand">{s.appName}</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-brand">Feed</Link>
              <Link href="/search" className="hover:text-brand">ค้นหา</Link>
              <Link href="/admin" className="hover:text-brand">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6"><SetupGate>{children}</SetupGate></main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} {s.appName}
        </footer>
      </body>
    </html>
  );
}
