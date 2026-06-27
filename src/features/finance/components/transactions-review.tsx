'use client';

import { Download, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { DeleteTransactionsDialog } from '@/features/finance/components/delete-transactions-dialog';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { ManualTransactionDialog } from '@/features/finance/components/manual-transaction-dialog';
import {
  CategorySelect,
  DeleteRowButton,
  SignedAmount,
  TablePaginationFooter,
} from '@/features/finance/components/transaction-table-parts';
import { TransactionsFilterBar } from '@/features/finance/components/transactions-filter-bar';
import { TransactionsReviewMetrics } from '@/features/finance/components/transactions-review-metrics';
import { pageSizeOptions } from '@/features/finance/data';
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
              <ManualTransactionDialog
                categories={transactionCategories}
                message={manualTransactionMessage}
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);

                  if (!open) {
                    setManualTransactionMessage(null);
                  }
                }}
                onSubmit={addManualTransaction}
              />
              <DeleteTransactionsDialog
                transactionCount={pendingDeleteIds.length}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
              />
            </>
          }
        />

        <TransactionsReviewMetrics
          expenseCount={transactionSummary.expenseCount}
          filteredCount={transactionSummary.filteredCount}
          selectedCount={selectedTransactionIds.length}
          totalBalance={transactionSummary.totalBalance}
        />

        <TransactionsFilterBar
          categories={categories}
          categoryFilter={categoryFilter}
          dateRange={dateRange}
          query={query}
          sortKey={sortKey}
          onCategoryFilterChange={setCategoryFilter}
          onDateRangeChange={setDateRange}
          onQueryChange={setQuery}
          onSortKeyChange={setSortKey}
        />

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
                        <CategorySelect
                          ariaLabel={`Category for ${transaction.description}`}
                          categories={transactionCategories}
                          className="w-48"
                          hasDraft={Boolean(
                            draftTransactionCategories[transaction.id],
                          )}
                          value={category}
                          onChange={(value) =>
                            updateDraftCategory(transaction.id, value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                        {categorySourceLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <SignedAmount amount={transaction.amount} />
                      </td>
                      <td className="px-4 py-3">
                        <DeleteRowButton
                          iconOnly
                          onClick={() => openDeleteDialog([transaction.id])}
                          srLabel={`Delete ${transaction.description}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePaginationFooter
            className="shrink-0"
            itemLabel=""
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            selectedCount={selectedTransactionIds.length}
            totalCount={filteredTransactions.length}
            visibleCount={visibleTransactions.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      </PageContainer>
    </FinanceAppShell>
  );
};
