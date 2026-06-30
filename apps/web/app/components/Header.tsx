'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  IconCamera,
  IconFolderOpen,
  IconImage,
  IconShield,
  IconSparkles,
  IconX,
} from './icons';

export default function Header({ appName }: { appName: string }) {
  return (
    <Suspense fallback={<HeaderShell appName={appName} />}>
      <HeaderInner appName={appName} />
    </Suspense>
  );
}

function HeaderShell({ appName }: { appName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 dark:border-neutral-800 bg-white/75 dark:bg-neutral-950/75 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm flex-none">
            <IconSparkles className="w-4 h-4" />
          </span>
          <span className="font-bold tracking-tight truncate">{appName}</span>
        </Link>
      </div>
    </header>
  );
}

function HeaderInner({ appName }: { appName: string }) {
  const pathname = usePathname() || '/';
  const sp = useSearchParams();
  const eventMatch = pathname.match(/^\/event\/([^/]+)(?:\/|$)/);
  const eventCode = eventMatch ? decodeURIComponent(eventMatch[1]) : null;

  const isAdminScope = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const isGuestScope = !!eventCode || pathname.startsWith('/live') || pathname.startsWith('/search') || pathname.startsWith('/photo');

  const feedHref = eventCode ? `/event/${encodeURIComponent(eventCode)}` : '/live';
  const searchHref = eventCode
    ? `/event/${encodeURIComponent(eventCode)}/search`
    : '/search';
  const brandHref = isAdminScope ? '/admin' : eventCode ? feedHref : '/';

  const isOn = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));
  const adminTab = sp?.get('tab') ?? 'folders';

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    location.href = '/admin/login';
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 dark:border-neutral-800 bg-white/75 dark:bg-neutral-950/75 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
        <Link href={brandHref} className="inline-flex items-center gap-2 group min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm flex-none">
            <IconSparkles className="w-4 h-4" />
          </span>
          <span className="font-bold tracking-tight truncate text-neutral-900 dark:text-neutral-100 group-hover:text-brand transition">
            {appName}
          </span>
          {isAdminScope && (
            <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-semibold tracking-wide text-neutral-600 dark:text-neutral-300 flex-none">
              <IconShield className="w-3 h-3" />
              ADMIN
            </span>
          )}
        </Link>

        {/* Admin scope: 3 menus + logout */}
        {isAdminScope && (
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/admin?tab=folders" active={adminTab === 'folders'} icon={<IconFolderOpen className="w-4 h-4" />}>
              Folders
            </NavLink>
            <NavLink href="/admin?tab=photos" active={adminTab === 'photos'} icon={<IconImage className="w-4 h-4" />}>
              ภาพ
            </NavLink>
            <NavLink href="/admin?tab=settings" active={adminTab === 'settings'} icon={<IconShield className="w-4 h-4" />}>
              ตั้งค่า
            </NavLink>
            <button
              onClick={logout}
              title="ออกจากระบบ"
              className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              aria-label="ออกจากระบบ"
            >
              <IconX className="w-4 h-4" />
            </button>
          </nav>
        )}

        {/* Guest scope: 2 menus */}
        {!isAdminScope && isGuestScope && (
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href={feedHref} active={isOn(feedHref)} icon={<IconImage className="w-4 h-4" />}>
              Feed
            </NavLink>
            <NavLink href={searchHref} active={isOn(searchHref)} icon={<IconCamera className="w-4 h-4" />}>
              ค้นหา
            </NavLink>
          </nav>
        )}

        {/* Default (welcome / help): minimal Admin entry */}
        {!isAdminScope && !isGuestScope && (
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/admin" active={false} icon={<IconShield className="w-4 h-4" />}>
              Admin
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
        active
          ? 'bg-brand/10 text-brand'
          : 'text-neutral-600 dark:text-neutral-400 hover:text-brand hover:bg-neutral-100 dark:hover:bg-neutral-900'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
