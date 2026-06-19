'use client';

import { Check, ChevronLeft, ListChecks, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { MetricCard } from '@/features/finance/components/metric-card';
import { formatSignedCurrency } from '@/features/finance/data';
import {
  isDuplicateTransaction,
  isSaveableTransaction,
} from '@/features/finance/duplicate-transactions';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { useFinanceSettings } from '@/features/finance/use-finance-settings';
import { cn } from '@/utils/cn';

export const ImportReview = ({ importId }: { importId: string }) => {
  const {
    confirmImport,
    deleteStagedTransactions,
    draftStagedTransactionCategories,
    hydrated,
    imports,
    stagedTransactions,
    transactions,
    updateStagedTransactionCategory,
  } = useFinanceData();
  const { categories } = useFinanceSettings();

  const batch = imports.find((item) => item.id === importId);
  const stagedImportTransactions = useMemo(
    () =>
      stagedTransactions.filter(
        (transaction) => transaction.importId === importId,
      ),
    [importId, stagedTransactions],
  );
  const stagedImportTransactionIds = useMemo(
    () =>
      new Set(stagedImportTransactions.map((transaction) => transaction.id)),
    [stagedImportTransactions],
  );
  const importedTransactions = useMemo(
    () =>
      stagedImportTransactions.length > 0
        ? stagedImportTransactions
        : transactions.filter(
            (transaction) => transaction.importId === importId,
          ),
    [importId, stagedImportTransactions, transactions],
  );
  const duplicateTransactions = importedTransactions.filter(
    isDuplicateTransaction,
  );
  const saveableTransactions = importedTransactions.filter(
    isSaveableTransaction,
  );
  const confirmRowsLabel = `Confirm ${saveableTransactions.length} ${
    saveableTransactions.length === 1 ? 'Row' : 'Rows'
  }`;
  const isResolved =
    batch?.status === 'Approved' ||
    (batch?.status === 'Duplicate' && stagedImportTransactions.length === 0);
  const hasUnsavedCategoryChanges = saveableTransactions.some(
    (transaction) => draftStagedTransactionCategories[transaction.id],
  );
  const uncertainCount = saveableTransactions.filter((transaction) => {
    const category =
      draftStagedTransactionCategories[transaction.id] ?? transaction.category;

    return (
      transaction.status === 'Review' ||
      category === 'Uncategorized' ||
      transaction.confidence < 70
    );
  }).length;
  const allCategorized =
    saveableTransactions.length > 0 &&
    uncertainCount === 0 &&
    saveableTransactions.every((transaction) => {
      const category =
        draftStagedTransactionCategories[transaction.id] ??
        transaction.category;

      return category !== 'Uncategorized';
    });
  const canResolveImport =
    importedTransactions.length > 0 &&
    (saveableTransactions.length > 0
      ? allCategorized
      : duplicateTransactions.length > 0);
  const ollamaCount = importedTransactions.filter(
    (transaction) => transaction.categorizationSource === 'ollama',
  ).length;

  const updateDraftCategory = (id: string, category: string) => {
    updateStagedTransactionCategory(id, category);
  };

  if (!hydrated) {
    return (
      <FinanceAppShell>
        <PageContainer>
          <Panel as="p" className="px-4 py-3 text-sm">
            Loading imported transactions...
          </Panel>
        </PageContainer>
      </FinanceAppShell>
    );
  }

  return (
    <FinanceAppShell>
      <PageContainer flow="grid">
        <PageHeader
          title="Review Imported Transactions"
          description={
            batch
              ? `${batch.fileName} - ${batch.rows} rows - ${batch.status}`
              : 'Imported batch not found in local storage.'
          }
          eyebrow={
            <Link
              href="/imports"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Imports
            </Link>
          }
          actions={
            <>
              <Link
                href="/transactions"
                className="inline-flex min-h-10 items-center justify-center rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
              >
                Open Transactions
              </Link>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                disabled={
                  isResolved || !canResolveImport || hasUnsavedCategoryChanges
                }
                onClick={() => confirmImport(importId)}
              >
                <ListChecks className="size-4" aria-hidden="true" />
                {confirmRowsLabel}
              </button>
            </>
          }
        />

        {importedTransactions.length > 0 ? (
          <>
            <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {[
                {
                  label: 'Rows Imported',
                  value: String(importedTransactions.length),
                  helper: `${ollamaCount} categorized by Ollama`,
                },
                {
                  label: 'Ready to Save',
                  value: String(saveableTransactions.length),
                  helper: 'Non-duplicate rows',
                },
                {
                  label: 'Needs Review',
                  value: String(uncertainCount),
                  helper: 'Low-confidence or uncategorized',
                },
                {
                  label: 'Duplicates',
                  value: String(duplicateTransactions.length),
                  helper: 'Skipped on confirm',
                },
              ].map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  helper={metric.helper}
                />
              ))}
            </section>

            <Panel clipped>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[78rem] border-collapse text-left text-sm">
                  <thead className="bg-[hsl(var(--surface-low))] text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                    <tr className="border-b border-[hsl(var(--outline-variant))]">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--outline-variant))]">
                    {importedTransactions.map((transaction) => {
                      const isDuplicate = isDuplicateTransaction(transaction);
                      const isApproved = transaction.status === 'Approved';
                      const canDelete =
                        stagedImportTransactionIds.has(transaction.id) &&
                        !isResolved;
                      const category =
                        draftStagedTransactionCategories[transaction.id] ??
                        transaction.category;
                      const needsReview =
                        !isDuplicate &&
                        (transaction.status === 'Review' ||
                          category === 'Uncategorized' ||
                          transaction.confidence < 70);

                      return (
                        <tr
                          key={transaction.id}
                          className={cn(
                            'transition-colors hover:bg-[hsl(var(--surface-low))]',
                            isDuplicate &&
                              'border-l-4 border-l-[hsl(var(--outline))] bg-[hsl(var(--surface-low))] text-[hsl(var(--on-surface-variant))]',
                            needsReview &&
                              'border-l-4 border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/25',
                          )}
                        >
                          <td className="whitespace-nowrap p-4 text-[hsl(var(--on-surface-variant))]">
                            {transaction.date}
                          </td>
                          <td className="p-4">
                            {isDuplicate ? (
                              <span className="font-medium">
                                {transaction.description}
                              </span>
                            ) : (
                              <Link
                                href={`/transactions/${transaction.id}`}
                                className="font-medium hover:underline"
                              >
                                {transaction.description}
                              </Link>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono font-medium">
                            {formatSignedCurrency(transaction.amount)}
                          </td>
                          <td className="p-4">
                            <label className="grid gap-2">
                              <span className="sr-only">
                                Category for {transaction.description}
                              </span>
                              <select
                                className={cn(
                                  'min-h-9 w-44 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] px-2 text-xs font-medium',
                                  needsReview &&
                                    'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
                                  draftStagedTransactionCategories[
                                    transaction.id
                                  ] &&
                                    'border-primary bg-[hsl(var(--surface-low))]',
                                )}
                                value={category}
                                onChange={(event) =>
                                  updateDraftCategory(
                                    transaction.id,
                                    event.target.value,
                                  )
                                }
                                disabled={isResolved || isDuplicate}
                              >
                                {categories.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.08em] text-[hsl(var(--outline))]">
                              {transaction.categorizationSource === 'ollama'
                                ? transaction.ollamaModel
                                : 'Manual review'}
                            </p>
                          </td>
                          <td className="p-4">
                            {isDuplicate ? (
                              <span className="text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                                Skipped
                              </span>
                            ) : (
                              <div className="flex min-w-28 items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-clip rounded-full bg-[hsl(var(--surface-highest))]">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      needsReview
                                        ? 'bg-amber-500'
                                        : 'bg-primary',
                                    )}
                                    style={{
                                      inlineSize: `${transaction.confidence}%`,
                                    }}
                                  />
                                </div>
                                <span className="w-10 text-right font-mono text-xs text-[hsl(var(--on-surface-variant))]">
                                  {transaction.confidence}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="max-w-xs p-4 text-xs leading-5 text-[hsl(var(--on-surface-variant))]">
                            {transaction.aiReason ?? 'No reason returned.'}
                          </td>
                          <td className="p-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                                isApproved
                                  ? 'bg-primary text-primary-foreground'
                                  : isDuplicate
                                    ? 'bg-[hsl(var(--surface-highest))]'
                                    : 'bg-[hsl(var(--surface-high))]',
                              )}
                            >
                              {isApproved ? (
                                <Check
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span
                                  className={cn(
                                    'size-1.5 rounded-full',
                                    needsReview
                                      ? 'bg-amber-600'
                                      : 'bg-[hsl(var(--on-surface-variant))]',
                                  )}
                                />
                              )}
                              {isDuplicate
                                ? 'Duplicate'
                                : needsReview && !isApproved
                                  ? 'Needs review'
                                  : transaction.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {canDelete ? (
                              <button
                                type="button"
                                className="inline-flex min-h-8 items-center gap-1.5 rounded border border-[hsl(var(--outline-variant))] px-2 text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                                onClick={() =>
                                  deleteStagedTransactions([transaction.id])
                                }
                              >
                                <Trash2
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                Delete
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : (
          <Panel className="p-6">
            <h2 className="text-base font-semibold">No rows found</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--on-surface-variant))]">
              This import is not available in local storage. Upload a CSV again
              or open the full transactions list.
            </p>
          </Panel>
        )}
      </PageContainer>
    </FinanceAppShell>
  );
};
