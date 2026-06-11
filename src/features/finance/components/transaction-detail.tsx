'use client';

import { ArrowLeft, Check, ChevronRight, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { categories, formatSignedCurrency } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

export const TransactionDetail = ({
  transactionId,
}: {
  transactionId: string;
}) => {
  const router = useRouter();
  const {
    approveTransaction,
    hydrated,
    imports,
    saveTransactionDetails,
    transactions,
  } = useFinanceData();
  const transaction = transactions.find((item) => item.id === transactionId);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setCategory(transaction.category);
    setNote(transaction.note ?? '');
  }, [transaction]);

  const importBatch = imports.find((item) => item.id === transaction?.importId);
  const similarTransactions = useMemo(() => {
    if (!transaction) {
      return [];
    }

    return transactions
      .filter(
        (item) =>
          item.id !== transaction.id &&
          (item.category === transaction.category ||
            item.merchant === transaction.merchant),
      )
      .slice(0, 4);
  }, [transaction, transactions]);
  const nextNeedsReview = transactions.find(
    (item) => item.id !== transactionId && item.status === 'Review',
  );

  const handleSave = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!transaction) {
      return;
    }

    saveTransactionDetails(transaction.id, { category, note });
  };

  const handleApprove = () => {
    if (!transaction) {
      return;
    }

    handleSave();
    approveTransaction(transaction.id);
  };

  const handleNextNeedsReview = () => {
    if (nextNeedsReview) {
      router.push(`/transactions/${nextNeedsReview.id}`);
    }
  };

  if (!hydrated) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-[90rem] p-4 md:p-8">
          <p className="rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 py-3 text-sm">
            Loading transaction...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!transaction) {
    return (
      <AppShell>
        <div className="mx-auto grid w-full max-w-3xl gap-4 p-4 md:p-8">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Transactions
          </Link>
          <section className="rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-6">
            <h1 className="text-xl font-semibold">Transaction not found</h1>
            <p className="mt-2 text-sm text-[hsl(var(--on-surface-variant))]">
              This row is not available in local storage.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const needsReview =
    transaction.status === 'Review' ||
    transaction.category === 'Uncategorized' ||
    transaction.confidence < 70;

  return (
    <AppShell>
      <form
        className="mx-auto grid w-full max-w-[90rem] content-start gap-6 p-4 md:p-8"
        onSubmit={handleSave}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Transactions
            </Link>
            <h1 className="mt-3 text-2xl font-bold leading-8 md:text-3xl md:leading-9">
              {transaction.merchant}
            </h1>
            <p className="mt-1 text-sm text-[hsl(var(--on-surface-variant))]">
              {transaction.date}
              {transaction.sourceFile ? ` · ${transaction.sourceFile}` : ''}
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-2xl font-semibold leading-8">
              {formatSignedCurrency(transaction.amount)}
            </p>
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                transaction.status === 'Approved'
                  ? 'bg-primary text-primary-foreground'
                  : needsReview
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-[hsl(var(--surface-high))]',
              )}
            >
              {transaction.status === 'Approved' ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
              {needsReview && transaction.status !== 'Approved'
                ? 'Needs review'
                : transaction.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-6">
            <section className="rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-5">
              <h2 className="border-b border-[hsl(var(--outline-variant))] pb-4 text-base font-semibold">
                Categorization
              </h2>
              <div className="mt-5 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Category</span>
                  <select
                    className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-3 text-sm"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Note</span>
                  <textarea
                    className="min-h-28 resize-y rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-3 py-2 text-sm"
                    placeholder="Add context for future cleanup..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-5">
              <h2 className="border-b border-[hsl(var(--outline-variant))] pb-4 text-base font-semibold">
                Raw Source
              </h2>
              <dl className="mt-5 grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                <div>
                  <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                    Original Description
                  </dt>
                  <dd className="rounded bg-[hsl(var(--surface-high))] px-2 py-1 font-mono text-[0.8125rem] leading-5">
                    {transaction.description}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                    Account / Source
                  </dt>
                  <dd className="font-mono text-[0.8125rem]">
                    {transaction.sourceFile ?? 'Manual / Seed'}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                    Import Batch
                  </dt>
                  <dd className="font-mono text-[0.8125rem]">
                    {importBatch?.fileName ?? transaction.importId ?? 'None'}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                    Transaction ID
                  </dt>
                  <dd className="break-all font-mono text-[0.8125rem]">
                    {transaction.id}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-5">
              <h2 className="border-b border-[hsl(var(--outline-variant))] pb-4 text-base font-semibold">
                Similar Transactions
              </h2>
              <div className="mt-2 divide-y divide-[hsl(var(--outline-variant))]">
                {similarTransactions.length > 0 ? (
                  similarTransactions.map((item) => (
                    <Link
                      key={item.id}
                      href={`/transactions/${item.id}`}
                      className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {item.merchant}
                        </span>
                        <span className="text-xs text-[hsl(var(--on-surface-variant))]">
                          {item.date} · {item.category}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs">
                        {formatSignedCurrency(item.amount)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="py-3 text-sm text-[hsl(var(--on-surface-variant))]">
                    No similar local transactions yet.
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-6">
            <section className="rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="size-5" aria-hidden="true" />
                <h2 className="text-base font-semibold">AI Suggestion</h2>
              </div>
              <p className="text-sm font-medium text-[hsl(var(--on-surface-variant))]">
                Confidence
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-clip rounded-full bg-[hsl(var(--surface-high))]">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      needsReview ? 'bg-amber-500' : 'bg-primary',
                    )}
                    style={{ inlineSize: `${transaction.confidence}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-sm font-bold">
                  {transaction.confidence}%
                </span>
              </div>
              <p className="mt-4 border-l-2 border-[hsl(var(--outline-variant))] pl-3 text-sm leading-6 text-[hsl(var(--on-surface-variant))]">
                {transaction.aiReason ?? 'No AI reason saved for this row.'}
              </p>
              <p className="mt-3 text-[0.6875rem] uppercase tracking-[0.08em] text-[hsl(var(--outline))]">
                {transaction.categorizationSource === 'ollama'
                  ? transaction.ollamaModel
                  : 'Local fallback'}
              </p>
            </section>

            <section className="grid gap-3 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-5">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-high))]"
              >
                <Save className="size-4" aria-hidden="true" />
                Save
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                onClick={handleApprove}
              >
                <Check className="size-4" aria-hidden="true" />
                Save & Approve
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                disabled={!nextNeedsReview}
                onClick={handleNextNeedsReview}
              >
                Next Needs Review
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </section>
          </aside>
        </div>
      </form>
    </AppShell>
  );
};
