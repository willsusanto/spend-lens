'use client';

import {
  ChartPie,
  Cloud,
  FileText,
  Home,
  List,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { paths } from '@/config/paths';
import { cn } from '@/utils/cn';

const navigation = [
  { href: paths.home.getHref(), label: 'Home', icon: Home },
  { href: paths.imports.getHref(), label: 'Imports', icon: FileText },
  { href: paths.transactions.getHref(), label: 'Transactions', icon: List },
  { href: paths.statistics.getHref(), label: 'Statistics', icon: ChartPie },
  { href: paths.settings.getHref(), label: 'Settings', icon: Settings },
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
    <div className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-transparent text-[hsl(var(--foreground))]">
      <header className="z-20 grid min-h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:px-6">
        <Link
          href={paths.home.getHref()}
          className="interactive-lift inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.72)] px-3 text-sm font-semibold shadow-sm backdrop-blur-xl"
        >
          <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          SpendLens
        </Link>

        <nav className="min-w-0" aria-label="Primary">
          <ul className="flex items-center justify-center gap-1 rounded-full border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.72)] p-1 shadow-sm backdrop-blur-xl">
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
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'interactive-lift relative inline-flex min-h-10 items-center rounded-full px-3 text-sm text-[hsl(var(--on-surface-variant))] hover:bg-[hsl(var(--surface-low))] hover:text-[hsl(var(--foreground))]',
                      isActive &&
                        'bg-[hsl(var(--foreground))] font-medium text-[hsl(var(--background))] shadow-sm hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))]',
                    )}
                  >
                    <Icon className="size-4 sm:mr-1.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{item.label}</span>
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
          'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth',
          contentPadding && 'px-4 pb-8 pt-2 sm:px-8 sm:pb-10',
        )}
      >
        {children}
      </main>
    </div>
  );
};
