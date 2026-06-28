'use client';

import { ArrowLeft, Check, ChevronRight, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { paths } from '@/config/paths';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import {
  CategorySelect,
  SignedAmount,
  TransactionStatusBadge,
} from '@/features/finance/components/transaction-table-parts';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { useFinanceSettings } from '@/features/finance/use-finance-settings';
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
  const { categories } = useFinanceSettings();
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
            item.description === transaction.description),
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
      router.push(paths.transactions.getDetailHref(nextNeedsReview.id));
    }
  };

  if (!hydrated) {
    return (
      <FinanceAppShell>
        <PageContainer>
          <Panel as="p" className="px-4 py-3 text-sm">
            Loading transaction...
          </Panel>
        </PageContainer>
      </FinanceAppShell>
    );
  }

  if (!transaction) {
    return (
      <FinanceAppShell>
        <PageContainer size="narrow" flow="grid" className="gap-4">
          <Link
            href={paths.transactions.getHref()}
            className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Transactions
          </Link>
          <Panel className="p-6">
            <h1 className="text-xl font-semibold">Transaction not found</h1>
            <p className="mt-2 text-sm text-[hsl(var(--on-surface-variant))]">
              This row is not available in local storage.
            </p>
          </Panel>
        </PageContainer>
      </FinanceAppShell>
    );
  }

  const needsReview =
    transaction.status === 'Review' ||
    transaction.category === 'Uncategorized' ||
    transaction.confidence < 70;

  return (
    <FinanceAppShell>
      <PageContainer as="form" flow="grid" onSubmit={handleSave}>
        <PageHeader
          title={transaction.description}
          description={
            <>
              {transaction.date}
              {transaction.sourceFile ? ` - ${transaction.sourceFile}` : ''}
            </>
          }
          eyebrow={
            <Link
              href={paths.transactions.getHref()}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Transactions
            </Link>
          }
          actions={
            <div className="md:text-right">
              <p className="text-2xl font-semibold leading-8">
                <SignedAmount amount={transaction.amount} />
              </p>
              <TransactionStatusBadge
                className="mt-2"
                state={
                  transaction.status === 'Approved'
                    ? 'approved'
                    : needsReview
                      ? 'needs-review'
                      : 'neutral'
                }
                text={
                  needsReview && transaction.status !== 'Approved'
                    ? 'Needs review'
                    : transaction.status
                }
              />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-6">
            <Panel>
              <PanelHeader className="p-5">
                <h2 className="text-base font-semibold">Categorization</h2>
              </PanelHeader>
              <div className="grid gap-5 p-5">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Category</span>
                  <CategorySelect
                    ariaLabel="Transaction category"
                    value={category}
                    categories={categories}
                    size="md"
                    onChange={setCategory}
                  />
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
            </Panel>

            <Panel>
              <PanelHeader className="p-5">
                <h2 className="text-base font-semibold">Raw Source</h2>
              </PanelHeader>
              <dl className="grid grid-cols-1 gap-4 p-5 text-xs md:grid-cols-2">
                <div>
                  <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                    Source Text
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
            </Panel>

            <Panel>
              <PanelHeader className="p-5">
                <h2 className="text-base font-semibold">
                  Similar Transactions
                </h2>
              </PanelHeader>
              <div className="divide-y divide-[hsl(var(--outline-variant))] px-5 py-2">
                {similarTransactions.length > 0 ? (
                  similarTransactions.map((item) => (
                    <Link
                      key={item.id}
                      href={paths.transactions.getDetailHref(item.id)}
                      className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {item.description}
                        </span>
                        <span className="text-xs text-[hsl(var(--on-surface-variant))]">
                          {item.date} - {item.category}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs">
                        <SignedAmount
                          amount={item.amount}
                          className="text-xs"
                        />
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="py-3 text-sm text-[hsl(var(--on-surface-variant))]">
                    No similar local transactions yet.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <aside className="grid content-start gap-6">
            <Panel className="p-5">
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
                  : 'Manual review'}
              </p>
            </Panel>

            <Panel className="grid gap-3 p-5">
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
            </Panel>
          </aside>
        </div>
      </PageContainer>
    </FinanceAppShell>
  );
};
