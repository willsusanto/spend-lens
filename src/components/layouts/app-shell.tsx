'use client';

import {
  Banknote,
  FilePlus2,
  Home,
  List,
  Menu,
  Plus,
  Settings,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { cn } from '@/utils/cn';

const navigation = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: List },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] p-4 md:flex md:flex-col">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="grid size-8 place-items-center rounded bg-primary text-primary-foreground">
            <Banknote className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xl font-bold leading-7">
              LedgerLocal
            </span>
            <span className="block text-xs font-medium leading-4 text-[hsl(var(--on-surface-variant))]">
              Personal Finance
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded px-4 py-2 text-sm font-medium text-[hsl(var(--on-surface-variant))] transition-colors hover:bg-[hsl(var(--surface-high))] hover:text-[hsl(var(--foreground))]',
                  isActive &&
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-5" aria-hidden="true" />
          Add Transaction
        </button>
      </aside>

      <div className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] px-4 md:hidden">
        <Link href="/" className="text-2xl font-bold leading-8">
          LedgerLocal
        </Link>
        <button
          type="button"
          className="grid min-h-10 min-w-10 place-items-center rounded-full hover:bg-[hsl(var(--surface-low))]"
        >
          <Menu className="size-6" aria-hidden="true" />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>

      <button
        type="button"
        className="fixed bottom-4 right-4 grid size-12 place-items-center rounded bg-primary text-primary-foreground shadow-sm md:hidden"
      >
        <FilePlus2 className="size-5" aria-hidden="true" />
        <span className="sr-only">Add transaction</span>
      </button>
    </div>
  );
};
