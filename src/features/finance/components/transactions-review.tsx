'use client';

import { Check, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { formatSignedCurrency } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

export const TransactionsReview = () => {
  const { approveTransaction, approveTransactions, transactions } =
    useFinanceData();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return transactions;
    }

    return transactions.filter((transaction) =>
      `${transaction.merchant} ${transaction.description} ${transaction.category}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, transactions]);

  const selectableIds = filteredTransactions
    .filter((transaction) => transaction.status !== 'Approved')
    .map((transaction) => transaction.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    setSelected(allSelected ? [] : selectableIds);
  };

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const approveSelected = () => {
    approveTransactions(selected);
    setSelected([]);
  };

  return (
    <AppShell>
      <div className="flex min-h-dvh flex-col bg-[hsl(var(--background))] md:h-dvh md:min-h-0">
        <header className="flex shrink-0 flex-col gap-4 border-b border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 py-6 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <h1 className="text-2xl font-bold leading-8 md:text-3xl md:leading-9">
              Transactions List
            </h1>
            <p className="mt-1 text-sm text-[hsl(var(--on-surface-variant))]">
              Manage and verify your recent financial activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              className="min-h-10 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              disabled={selected.length === 0}
              onClick={approveSelected}
            >
              Approve Selected
            </button>
          </div>
        </header>

        <search className="flex shrink-0 flex-wrap items-center gap-4 px-4 py-4 md:px-8">
          <label className="relative min-w-60 flex-1 md:max-w-sm">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--on-surface-variant))]"
              aria-hidden="true"
            />
            <span className="sr-only">Search merchants</span>
            <input
              className="min-h-10 w-full rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] pl-9 pr-4 text-sm"
              placeholder="Search merchants..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {['Last 30 Days', 'Category', 'AI Confidence'].map((label) => (
            <button
              key={label}
              type="button"
              className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-3 py-2 text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
            >
              {label}
            </button>
          ))}
        </search>

        <div className="min-h-0 flex-1 px-4 pb-8 md:px-8">
          <div className="flex max-h-full min-h-0 flex-col overflow-clip rounded-lg border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
              <table className="w-full min-w-[62rem] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-[hsl(var(--surface-low))]">
                  <tr className="border-b border-[hsl(var(--outline-variant))]">
                    <th className="w-12 p-4">
                      <input
                        aria-label="Select all"
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    {[
                      'Date',
                      'Merchant / Description',
                      'Amount',
                      'Category',
                      'AI Match',
                      'Status',
                      'Action',
                    ].map((header) => (
                      <th
                        key={header}
                        className="p-4 text-balance text-sm font-medium text-[hsl(var(--on-surface-variant))]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--outline-variant))] text-sm">
                  {filteredTransactions.map((transaction) => {
                    const isApproved = transaction.status === 'Approved';

                    return (
                      <tr
                        key={`${transaction.id}-${transaction.date}`}
                        className={cn(
                          'transition-colors hover:bg-[hsl(var(--surface-low))]',
                          transaction.status === 'Review' && 'bg-red-50/40',
                        )}
                      >
                        <td className="p-4">
                          <input
                            aria-label={`Select ${transaction.merchant}`}
                            type="checkbox"
                            disabled={isApproved}
                            checked={selected.includes(transaction.id)}
                            onChange={() => toggleSelected(transaction.id)}
                          />
                        </td>
                        <td className="whitespace-nowrap p-4 text-[hsl(var(--on-surface-variant))]">
                          {transaction.date}
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/transactions/${transaction.id}`}
                            className="font-medium hover:underline"
                          >
                            {transaction.merchant}
                          </Link>
                          <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
                            {transaction.description}
                          </p>
                        </td>
                        <td className="p-4 text-right font-mono text-sm font-medium">
                          {formatSignedCurrency(transaction.amount)}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] px-2 py-1 text-xs font-medium">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-clip rounded-full bg-[hsl(var(--surface-highest))]">
                              <div
                                className="h-full rounded-full bg-primary"
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
                        <td className="p-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                              isApproved
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-[hsl(var(--surface-high))]',
                            )}
                          >
                            {isApproved ? (
                              <Check className="size-3.5" aria-hidden="true" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-[hsl(var(--on-surface-variant))]" />
                            )}
                            {transaction.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            className="rounded border border-[hsl(var(--outline-variant))] px-2 py-1 text-xs font-medium disabled:opacity-40"
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
            <footer className="flex shrink-0 flex-col gap-3 border-t border-[hsl(var(--outline-variant))] p-4 text-xs text-[hsl(var(--on-surface-variant))] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredTransactions.length} of {transactions.length}{' '}
                entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid min-h-8 min-w-8 place-items-center rounded border border-[hsl(var(--outline-variant))] disabled:opacity-50"
                  disabled
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={cn(
                      'min-h-8 rounded border border-[hsl(var(--outline-variant))] px-3 font-medium',
                      page === 1 &&
                        'border-primary bg-primary text-primary-foreground',
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="grid min-h-8 min-w-8 place-items-center rounded border border-[hsl(var(--outline-variant))]"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
