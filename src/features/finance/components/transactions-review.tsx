'use client';

import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers3,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { formatSignedCurrency, pageSizeOptions } from '@/features/finance/data';
import {
  getTransactionsExportFileName,
  serializeTransactionsCsv,
} from '@/features/finance/export-transactions';
import { uncategorizedCategory } from '@/features/finance/finance-settings';
import {
  allCategoriesFilter,
  getFilteredTransactions,
  getTransactionReviewSummary,
  TransactionDateRange,
  TransactionSortKey,
} from '@/features/finance/transaction-review-utils';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { useFinanceSettings } from '@/features/finance/use-finance-settings';
import { cn } from '@/utils/cn';

const getQuickMetricTone = (index: number) =>
  [
    'from-zinc-950 to-zinc-700 text-white dark:from-stone-100 dark:to-stone-300 dark:text-zinc-950',
    'from-emerald-500 to-teal-600 text-white',
    'from-amber-400 to-orange-500 text-zinc-950',
  ][index];

const getCategorySourceLabel = (
  source: 'ollama' | 'manual' | undefined,
  hasDraft: boolean,
) => {
  if (hasDraft || source === 'manual') {
    return 'Manual';
  }

  return source === 'ollama' ? 'AI' : 'Manual';
};

export const TransactionsReview = () => {
  const {
    addTransaction,
    deleteTransactions,
    draftTransactionCategories,
    transactions,
    updateTransactionCategory,
  } = useFinanceData();
  const { categories } = useFinanceSettings();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(allCategoriesFilter);
  const [dateRange, setDateRange] = useState<TransactionDateRange>('30');
  const [sortKey, setSortKey] = useState<TransactionSortKey>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof pageSizeOptions)[number]>(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualTransactionMessage, setManualTransactionMessage] = useState<
    string | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const transactionCategories = useMemo(
    () => categories.filter((category) => category !== uncategorizedCategory),
    [categories],
  );

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, dateRange, pageSize, query, sortKey]);

  useEffect(() => {
    if (
      categoryFilter !== allCategoriesFilter &&
      !categories.includes(categoryFilter)
    ) {
      setCategoryFilter(allCategoriesFilter);
    }
  }, [categories, categoryFilter]);

  const filteredTransactions = useMemo(
    () =>
      getFilteredTransactions(transactions, {
        categoryFilter,
        dateRange,
        draftCategories: draftTransactionCategories,
        query,
        sortKey,
      }),
    [
      categoryFilter,
      dateRange,
      draftTransactionCategories,
      query,
      sortKey,
      transactions,
    ],
  );

  const pageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize),
  );
  const transactionSummary = useMemo(
    () => getTransactionReviewSummary(filteredTransactions),
    [filteredTransactions],
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const visibleTransactions = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const visibleTransactionIds = visibleTransactions.map(
    (transaction) => transaction.id,
  );
  const selectedVisibleIds = visibleTransactionIds.filter((id) =>
    selectedTransactionIds.includes(id),
  );
  const allVisibleSelected =
    visibleTransactionIds.length > 0 &&
    selectedVisibleIds.length === visibleTransactionIds.length;

  const openDeleteDialog = (ids: string[]) => {
    setPendingDeleteIds(ids);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteTransactions(pendingDeleteIds);
    setSelectedTransactionIds((current) =>
      current.filter((id) => !pendingDeleteIds.includes(id)),
    );
    setPendingDeleteIds([]);
    setDeleteDialogOpen(false);
  };

  const updateDraftCategory = (id: string, category: string) => {
    updateTransactionCategory(id, category);
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactionIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedTransactionIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleTransactionIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleTransactionIds]));
    });
  };

  const exportFilteredTransactions = () => {
    if (filteredTransactions.length === 0) {
      return;
    }

    const csv = serializeTransactionsCsv(filteredTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getTransactionsExportFileName();
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const addManualTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const amount = Number(data.get('amount'));
    const type = data.get('type');

    const result = addTransaction({
      date: String(data.get('date')),
      description: String(data.get('details')),
      category: String(data.get('category')),
      amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
    });

    setManualTransactionMessage(result.message);

    if (result.status === 'duplicate') {
      return;
    }

    event.currentTarget.reset();
    setDialogOpen(false);
  };

  return (
    <FinanceAppShell>
      <PageContainer flow="space" className="max-w-5xl pt-3 sm:pt-6">
        <PageHeader
          title="Transactions"
          description="Manage and review your local ledger entries."
          actions={
            <>
              <button
                type="button"
                className="interactive-lift inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.82)] px-4 text-sm font-semibold shadow-sm backdrop-blur-xl hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                disabled={filteredTransactions.length === 0}
                onClick={exportFilteredTransactions}
              >
                <Download className="size-4" aria-hidden="true" />
                Export CSV
              </button>
              <button
                type="button"
                className="interactive-lift inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.82)] px-4 text-sm font-semibold shadow-sm backdrop-blur-xl hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                disabled={selectedTransactionIds.length === 0}
                onClick={() => openDeleteDialog(selectedTransactionIds)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete Selected
              </button>
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);

                  if (!open) {
                    setManualTransactionMessage(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="interactive-lift inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add Transaction
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
                  <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                      Create a manual local ledger entry.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    id="manual-transaction-form"
                    className="grid gap-4"
                    onSubmit={addManualTransaction}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium">
                        Date
                        <input
                          required
                          name="date"
                          type="date"
                          className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Amount
                        <input
                          required
                          min="0"
                          name="amount"
                          step="0.01"
                          type="number"
                          className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                        />
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm font-medium">
                      Description
                      <input
                        required
                        name="details"
                        className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium">
                        Category
                        <select
                          required
                          name="category"
                          className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                        >
                          {transactionCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Type
                        <select
                          required
                          name="type"
                          defaultValue="expense"
                          className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </label>
                    </div>
                    {manualTransactionMessage ? (
                      <p
                        aria-live="polite"
                        className={cn(
                          'rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-3 py-2 text-sm text-[hsl(var(--on-surface-variant))]',
                          manualTransactionMessage.startsWith('Duplicate') &&
                            'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
                        )}
                      >
                        {manualTransactionMessage}
                      </p>
                    ) : null}
                  </form>
                  <DialogFooter>
                    <DialogClose asChild>
                      <button
                        type="button"
                        className="min-h-10 rounded border border-[hsl(var(--outline-variant))] px-4 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </DialogClose>
                    <button
                      type="submit"
                      form="manual-transaction-form"
                      className="min-h-10 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      Save Transaction
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogContent className="rounded border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
                  <DialogHeader>
                    <DialogTitle>Delete Transaction</DialogTitle>
                    <DialogDescription>
                      Delete {pendingDeleteIds.length}{' '}
                      {pendingDeleteIds.length === 1
                        ? 'transaction'
                        : 'transactions'}
                      ? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <button
                        type="button"
                        className="min-h-10 rounded border border-[hsl(var(--outline-variant))] px-4 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </DialogClose>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-destructive px-4 text-sm font-semibold text-destructive-foreground"
                      onClick={confirmDelete}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        <section className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: WalletCards,
              label: 'Filtered balance',
              value: formatSignedCurrency(transactionSummary.totalBalance),
              helper: `${transactionSummary.filteredCount} matching rows`,
            },
            {
              icon: Layers3,
              label: 'Expense rows',
              value: String(transactionSummary.expenseCount),
              helper: 'Ready for review or export',
            },
            {
              icon: CheckCircle2,
              label: 'Selected rows',
              value: String(selectedTransactionIds.length),
              helper: 'Bulk actions stay one tap away',
            },
          ].map((metric, index) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className={cn(
                  'animate-enter overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-[0_18px_50px_hsl(var(--foreground)/0.10)]',
                  getQuickMetricTone(index),
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium opacity-80">
                    {metric.label}
                  </p>
                  <span className="grid size-10 place-items-center rounded-full bg-white/20 text-current backdrop-blur">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm opacity-75">{metric.helper}</p>
              </div>
            );
          })}
        </section>

        <search className="animate-enter grid gap-3 rounded-2xl border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.82)] p-3 shadow-sm backdrop-blur-xl sm:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
          <label className="relative min-w-0">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <span className="sr-only">Search transaction details</span>
            <input
              className="min-h-10 w-full rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] pl-9 pr-3 text-sm"
              placeholder="Search details..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Category filter</span>
            <select
              className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {[allCategoriesFilter, ...categories].map((category) => (
                <option key={category} value={category}>
                  {category === allCategoriesFilter
                    ? 'All Categories'
                    : category}
                </option>
              ))}
            </select>
          </label>
          <label className="relative">
            <Calendar
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <span className="sr-only">Date range</span>
            <select
              className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] pl-9 pr-3 text-sm"
              value={dateRange}
              onChange={(event) =>
                setDateRange(event.target.value as TransactionDateRange)
              }
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Dates</option>
            </select>
          </label>
          <label className="relative">
            <SlidersHorizontal
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <span className="sr-only">Sort transactions</span>
            <select
              className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] pl-9 pr-3 text-sm"
              value={sortKey}
              onChange={(event) =>
                setSortKey(event.target.value as TransactionSortKey)
              }
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount High</option>
              <option value="amount-low">Amount Low</option>
            </select>
          </label>
        </search>

        <section className="animate-enter flex min-h-[34rem] flex-col overflow-clip rounded-3xl border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.86)] shadow-[0_24px_70px_hsl(var(--foreground)/0.10)] backdrop-blur-xl">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[62rem] border-collapse text-left text-sm">
              <caption className="sr-only">Transactions list</caption>
              <thead className="sticky top-0 z-10 bg-[hsl(var(--surface-lowest)/0.94)] backdrop-blur-xl">
                <tr className="border-b border-[hsl(var(--outline-variant))]">
                  <th scope="col" className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[hsl(var(--outline-variant))]"
                      aria-label="Select visible transactions"
                      checked={allVisibleSelected}
                      onChange={toggleVisibleSelection}
                    />
                  </th>
                  {[
                    'Date',
                    'Description',
                    'Category',
                    'Category Source',
                    'Amount',
                    'Action',
                  ].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => {
                  const selected = selectedTransactionIds.includes(
                    transaction.id,
                  );
                  const category =
                    draftTransactionCategories[transaction.id] ??
                    transaction.category;
                  const categorySourceLabel = getCategorySourceLabel(
                    transaction.categorizationSource,
                    Boolean(draftTransactionCategories[transaction.id]),
                  );

                  return (
                    <tr
                      key={`${transaction.id}-${transaction.date}`}
                      className="border-b border-[hsl(var(--outline-variant)/0.65)] transition-colors last:border-b-0 hover:bg-[hsl(var(--surface-low)/0.75)]"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-[hsl(var(--outline-variant))]"
                          aria-label={`Select ${transaction.description}`}
                          checked={selected}
                          onChange={() =>
                            toggleTransactionSelection(transaction.id)
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                        {transaction.date}
                      </td>
                      <th scope="row" className="px-4 py-3 font-medium">
                        {transaction.description}
                      </th>
                      <td className="px-4 py-3">
                        <label>
                          <span className="sr-only">
                            Category for {transaction.description}
                          </span>
                          <select
                            className={cn(
                              'min-h-9 w-48 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] px-2 text-xs font-medium',
                              draftTransactionCategories[transaction.id] &&
                                'border-primary bg-[hsl(var(--surface-low))]',
                            )}
                            value={category}
                            onChange={(event) =>
                              updateDraftCategory(
                                transaction.id,
                                event.target.value,
                              )
                            }
                          >
                            {transactionCategories.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                        {categorySourceLabel}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-4 py-3 text-right font-mono font-semibold',
                          transaction.amount > 0 &&
                            'text-emerald-700 dark:text-emerald-300',
                        )}
                      >
                        {formatSignedCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="grid min-h-8 min-w-8 place-items-center rounded border border-[hsl(var(--outline-variant))] transition-colors hover:bg-[hsl(var(--surface-low))]"
                          onClick={() => openDeleteDialog([transaction.id])}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">
                            Delete {transaction.description}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex shrink-0 flex-col gap-3 border-t border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.9)] px-4 py-3 text-xs text-[hsl(var(--on-surface-variant))] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {visibleTransactions.length} of{' '}
              {filteredTransactions.length}
              {selectedTransactionIds.length > 0
                ? ` - ${selectedTransactionIds.length} selected`
                : ''}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  className="min-h-8 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-2 text-xs"
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(
                      Number(
                        event.target.value,
                      ) as (typeof pageSizeOptions)[number],
                    )
                  }
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))]"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                <span className="sr-only">Previous page</span>
              </button>
              <button
                type="button"
                className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))] disabled:opacity-40"
                disabled={page === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                <ChevronRight className="size-4" aria-hidden="true" />
                <span className="sr-only">Next page</span>
              </button>
            </div>
          </footer>
        </section>
      </PageContainer>
    </FinanceAppShell>
  );
};
