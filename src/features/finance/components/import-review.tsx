'use client';

import { Check, ChevronLeft, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { MetricCard } from '@/features/finance/components/metric-card';
import { categories, formatSignedCurrency } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

export const ImportReview = ({ importId }: { importId: string }) => {
  const {
    confirmImport,
    draftStagedTransactionCategories,
    hydrated,
    imports,
    stagedTransactions,
    transactions,
    updateStagedTransactionCategory,
  } = useFinanceData();

  const batch = imports.find((item) => item.id === importId);
  const stagedImportTransactions = useMemo(
    () =>
      stagedTransactions.filter(
        (transaction) => transaction.importId === importId,
      ),
    [importId, stagedTransactions],
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
  const isConfirmed = batch?.status === 'Approved';
  const hasUnsavedCategoryChanges = importedTransactions.some(
    (transaction) => draftStagedTransactionCategories[transaction.id],
  );
  const duplicateCount = importedTransactions.filter(
    (transaction) => transaction.isDuplicate,
  ).length;
  const reviewableTransactions = importedTransactions.filter(
    (transaction) => !transaction.isDuplicate,
  );
  const uncertainCount = importedTransactions.filter((transaction) => {
    if (transaction.isDuplicate) {
      return false;
    }

    const category =
      draftStagedTransactionCategories[transaction.id] ?? transaction.category;

    return (
      transaction.status === 'Review' ||
      category === 'Uncategorized' ||
      transaction.confidence < 70
    );
  }).length;
  const canConfirmImport =
    importedTransactions.length > 0 &&
    uncertainCount === 0 &&
    reviewableTransactions.every((transaction) => {
      const category =
        draftStagedTransactionCategories[transaction.id] ??
        transaction.category;

      return category !== 'Uncategorized';
    });
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
                  isConfirmed || !canConfirmImport || hasUnsavedCategoryChanges
                }
                onClick={() => confirmImport(importId)}
              >
                <ListChecks className="size-4" aria-hidden="true" />
                Confirm Import
              </button>
            </>
          }
        />

        {importedTransactions.length > 0 ? (
          <>
            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                {
                  label: 'Rows Imported',
                  value: String(importedTransactions.length),
                  helper: `${ollamaCount} categorized by Ollama`,
                },
                {
                  label: 'Needs Review',
                  value: String(uncertainCount),
                  helper: 'Low-confidence or uncategorized',
                },
                {
                  label: 'Duplicates',
                  value: String(duplicateCount),
                  helper: 'Matched by date, description, and amount',
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
                <table className="w-full min-w-[74rem] border-collapse text-left text-sm">
                  <thead className="bg-[hsl(var(--surface-low))] text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                    <tr className="border-b border-[hsl(var(--outline-variant))]">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--outline-variant))]">
                    {importedTransactions.map((transaction) => {
                      const isApproved = transaction.status === 'Approved';
                      const category =
                        draftStagedTransactionCategories[transaction.id] ??
                        transaction.category;
                      const needsReview =
                        !transaction.isDuplicate &&
                        (transaction.status === 'Review' ||
                          category === 'Uncategorized' ||
                          transaction.confidence < 70);

                      return (
                        <tr
                          key={transaction.id}
                          className={cn(
                            'transition-colors hover:bg-[hsl(var(--surface-low))]',
                            transaction.isDuplicate &&
                              'border-l-4 border-l-rose-500 bg-rose-50/70 dark:bg-rose-950/25',
                            needsReview &&
                              'border-l-4 border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/25',
                          )}
                        >
                          <td className="whitespace-nowrap p-4 text-[hsl(var(--on-surface-variant))]">
                            {transaction.date}
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/transactions/${transaction.id}`}
                              className="font-medium hover:underline"
                            >
                              {transaction.description}
                            </Link>
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
                                  transaction.isDuplicate &&
                                    'border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100',
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
                                disabled={
                                  isConfirmed || transaction.isDuplicate
                                }
                              >
                                {categories.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.08em] text-[hsl(var(--outline))]">
                              {transaction.isDuplicate
                                ? 'Duplicate'
                                : transaction.categorizationSource === 'ollama'
                                  ? transaction.ollamaModel
                                  : 'Manual review'}
                            </p>
                          </td>
                          <td className="p-4">
                            <div className="flex min-w-28 items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-clip rounded-full bg-[hsl(var(--surface-highest))]">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    needsReview ? 'bg-amber-500' : 'bg-primary',
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
                          </td>
                          <td className="max-w-xs p-4 text-xs leading-5 text-[hsl(var(--on-surface-variant))]">
                            {transaction.aiReason ?? 'No reason returned.'}
                          </td>
                          <td className="p-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                                transaction.isDuplicate
                                  ? 'bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100'
                                  : isApproved
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-[hsl(var(--surface-high))]',
                              )}
                            >
                              {isApproved && !transaction.isDuplicate ? (
                                <Check
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span
                                  className={cn(
                                    'size-1.5 rounded-full',
                                    transaction.isDuplicate
                                      ? 'bg-rose-600'
                                      : needsReview
                                        ? 'bg-amber-600'
                                        : 'bg-[hsl(var(--on-surface-variant))]',
                                  )}
                                />
                              )}
                              {transaction.isDuplicate
                                ? 'Duplicate'
                                : needsReview && !isApproved
                                  ? 'Needs review'
                                  : transaction.status}
                            </span>
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
