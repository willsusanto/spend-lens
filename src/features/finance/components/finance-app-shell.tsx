'use client';

import { Check, CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { paths } from '@/config/paths';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

type FinanceAppShellProps = {
  children: ReactNode;
  contentPadding?: boolean;
};

const FinanceSyncIndicator = () => {
  const {
    activeImport,
    imports,
    stagedImportSyncStatuses,
    transactionsSyncStatus,
  } = useFinanceData();
  const importLabel = activeImport.isProcessing
    ? `Processing ${activeImport.processedRows} of ${activeImport.totalRows}`
    : activeImport.isComplete
      ? 'Import complete'
      : 'Local sync idle';
  const importStatuses = Object.entries(stagedImportSyncStatuses);
  const pendingImportIds = importStatuses
    .filter(([, status]) => status.state === 'pending')
    .map(([id]) => id);
  const savedSources = [
    transactionsSyncStatus.lastSavedAt
      ? {
          label: 'Transactions',
          savedAt: transactionsSyncStatus.lastSavedAt,
        }
      : null,
    ...importStatuses
      .filter(([, status]) => status.lastSavedAt)
      .map(([id, status]) => ({
        label: getImportStatusLabel(id, imports, activeImport.fileName),
        savedAt: status.lastSavedAt as Date,
      })),
  ].filter((source): source is { label: string; savedAt: Date } =>
    Boolean(source),
  );
  const pendingSources = [
    transactionsSyncStatus.state === 'pending' ? 'Transactions' : null,
    ...pendingImportIds.map((id) =>
      getImportStatusLabel(id, imports, activeImport.fileName),
    ),
  ].filter((source): source is string => Boolean(source));
  const latestSavedSource = savedSources.toSorted(
    (left, right) => right.savedAt.getTime() - left.savedAt.getTime(),
  )[0];
  const autosaveLabel =
    pendingSources.length > 0
      ? latestSavedSource
        ? `Saving changes: ${pendingSources.join(', ')}. Last saved ${latestSavedSource.label} at ${formatSavedAt(latestSavedSource.savedAt)}`
        : `Saving changes: ${pendingSources.join(', ')}`
      : latestSavedSource
        ? `Saved. Last saved ${latestSavedSource.label} at ${formatSavedAt(latestSavedSource.savedAt)}`
        : null;

  return (
    <>
      <Link
        href={paths.home.getHref()}
        className={cn(
          'inline-flex min-h-10 items-center justify-center gap-2 rounded px-2 text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-low))] sm:px-3',
          activeImport.isProcessing &&
            'bg-[hsl(var(--surface-low))] font-medium',
        )}
        title={importLabel}
      >
        {activeImport.isProcessing ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : activeImport.isComplete ? (
          <CheckCircle2 className="size-5" aria-hidden="true" />
        ) : (
          <Cloud className="size-5" aria-hidden="true" />
        )}
        <span className="hidden max-w-32 truncate text-xs sm:inline">
          {importLabel}
        </span>
        <span className="sr-only">{importLabel}</span>
      </Link>
      {autosaveLabel ? (
        <span
          aria-label={autosaveLabel}
          aria-live="polite"
          className={cn(
            'grid min-h-10 min-w-10 place-items-center rounded text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-low))]',
            pendingSources.length > 0 &&
              'bg-[hsl(var(--surface-low))] font-medium',
          )}
          role="status"
          title={autosaveLabel}
        >
          {pendingSources.length > 0 ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-5" aria-hidden="true" />
          )}
        </span>
      ) : null}
    </>
  );
};

const getImportStatusLabel = (
  importId: string,
  imports: { fileName: string; id: string }[],
  activeFileName: string | null,
) => {
  const importBatch = imports.find((item) => item.id === importId);

  if (importBatch) {
    return `Import ${importBatch.fileName}`;
  }

  return activeFileName ? `Import ${activeFileName}` : 'Import batch';
};

const formatSavedAt = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    second: '2-digit',
  }).format(date);

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
