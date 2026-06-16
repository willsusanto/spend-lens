'use client';

import { CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

type FinanceAppShellProps = {
  children: ReactNode;
  contentPadding?: boolean;
};

const FinanceSyncIndicator = () => {
  const { activeImport } = useFinanceData();
  const syncLabel = activeImport.isProcessing
    ? `Processing ${activeImport.processedRows} of ${activeImport.totalRows}`
    : activeImport.isComplete
      ? 'Import complete'
      : 'Local sync idle';

  return (
    <Link
      href="/"
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded px-2 text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-low))] sm:px-3',
        activeImport.isProcessing && 'bg-[hsl(var(--surface-low))] font-medium',
      )}
      title={syncLabel}
    >
      {activeImport.isProcessing ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : activeImport.isComplete ? (
        <CheckCircle2 className="size-5" aria-hidden="true" />
      ) : (
        <Cloud className="size-5" aria-hidden="true" />
      )}
      <span className="hidden max-w-32 truncate text-xs sm:inline">
        {syncLabel}
      </span>
      <span className="sr-only">{syncLabel}</span>
    </Link>
  );
};

export const FinanceAppShell = ({
  children,
  contentPadding,
}: FinanceAppShellProps) => {
  return (
    <AppShell
      contentPadding={contentPadding}
      syncIndicator={<FinanceSyncIndicator />}
    >
      {children}
    </AppShell>
  );
};
