'use client';

import { Check, ChevronLeft, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { MetricCard } from '@/features/finance/components/metric-card';
import { categories, formatSignedCurrency } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

export const ImportReview = ({ importId }: { importId: string }) => {
  const {
    approveTransaction,
    confirmImport,
    hydrated,
    imports,
    transactions,
    updateTransactionCategory,
  } = useFinanceData();

  const batch = imports.find((item) => item.id === importId);
  const importedTransactions = useMemo(
    () =>
      transactions.filter((transaction) => transaction.importId === importId),
    [importId, transactions],
  );
  const uncertainCount = importedTransactions.filter(
    (transaction) =>
      transaction.status === 'Review' ||
      transaction.category === 'Uncategorized' ||
      transaction.confidence < 70,
  ).length;
  const ollamaCount = importedTransactions.filter(
    (transaction) => transaction.categorizationSource === 'ollama',
  ).length;

  if (!hydrated) {
    return (
      <AppShell>
        <PageContainer>
          <Panel as="p" className="px-4 py-3 text-sm">
            Loading imported transactions...
          </Panel>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer flow="grid">
        <PageHeader
          title="Review Imported Transactions"
          description={
            batch
              ? `${batch.fileName} · ${batch.rows} rows · ${batch.status}`
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
                disabled={importedTransactions.length === 0}
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
                  label: 'Approved',
                  value: String(
                    importedTransactions.filter(
                      (transaction) => transaction.status === 'Approved',
                    ).length,
                  ),
                  helper: 'Ready for the weekly summary',
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
                      <th className="px-4 py-3">Merchant / Source Text</th>
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
                      const isApproved = transaction.status === 'Approved';
                      const needsReview =
                        transaction.status === 'Review' ||
                        transaction.category === 'Uncategorized' ||
                        transaction.confidence < 70;

                      return (
                        <tr
                          key={transaction.id}
                          className={cn(
                            'transition-colors hover:bg-[hsl(var(--surface-low))]',
                            needsReview &&
                              'border-l-4 border-l-amber-500 bg-amber-50/70',
                          )}
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-[hsl(var(--on-surface-variant))]">
                            {transaction.date}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/transactions/${transaction.id}`}
                              className="font-medium hover:underline"
                            >
                              {transaction.merchant}
                            </Link>
                            <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--on-surface-variant))]">
                              {transaction.description}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-medium">
                            {formatSignedCurrency(transaction.amount)}
                          </td>
                          <td className="px-4 py-4">
                            <label className="grid gap-2">
                              <span className="sr-only">
                                Category for {transaction.merchant}
                              </span>
                              <select
                                className={cn(
                                  'min-h-9 w-44 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] px-2 text-xs font-medium',
                                  needsReview &&
                                    'border-amber-500 bg-white text-amber-950',
                                )}
                                value={transaction.category}
                                onChange={(event) =>
                                  updateTransactionCategory(
                                    transaction.id,
                                    event.target.value,
                                  )
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
                              {transaction.categorizationSource === 'ollama'
                                ? transaction.ollamaModel
                                : 'Local fallback'}
                            </p>
                          </td>
                          <td className="px-4 py-4">
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
                          <td className="max-w-xs px-4 py-4 text-xs leading-5 text-[hsl(var(--on-surface-variant))]">
                            {transaction.aiReason ?? 'No reason returned.'}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                                isApproved
                                  ? 'bg-primary text-primary-foreground'
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
                              {needsReview && !isApproved
                                ? 'Needs review'
                                : transaction.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              className="rounded border border-[hsl(var(--outline-variant))] px-2 py-1 text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                              disabled={isApproved}
                              onClick={() => approveTransaction(transaction.id)}
                            >
                              Approve
                            </button>
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
    </AppShell>
  );
};
