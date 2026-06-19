'use client';

import { ChartPie, Cloud, Home, List, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { cn } from '@/utils/cn';

const navigation = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: List },
  { href: '/statistics', label: 'Statistics', icon: ChartPie },
  { href: '/settings', label: 'Settings', icon: Settings },
];

type AppShellProps = {
  children: ReactNode;
  contentPadding?: boolean;
  syncIndicator?: ReactNode;
};

export const AppShell = ({
  children,
  contentPadding = true,
  syncIndicator,
}: AppShellProps) => {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="z-20 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 sm:px-6">
        <Link href="/" className="text-base font-bold leading-5">
          LedgerLocal
        </Link>

        <nav className="min-w-0" aria-label="Primary">
          <ul className="flex items-center justify-center gap-1 sm:gap-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-14 items-center px-2 text-sm text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]',
                      isActive &&
                        'font-medium text-[hsl(var(--foreground))] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[hsl(var(--foreground))]',
                    )}
                  >
                    <Icon
                      className="mr-1.5 size-4 sm:hidden"
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex justify-end gap-2">
          {syncIndicator ?? (
            <button
              type="button"
              className="grid min-h-10 min-w-10 place-items-center rounded text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-low))]"
              title="Local sync idle"
            >
              <Cloud className="size-5" aria-hidden="true" />
              <span className="sr-only">Local sync idle</span>
            </button>
          )}
        </div>
      </header>

      <main
        id="content"
        className={cn(
          'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain',
          contentPadding && 'p-5 sm:p-8',
        )}
      >
        {children}
      </main>
    </div>
  );
};
