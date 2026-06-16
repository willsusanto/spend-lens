'use client';

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

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
import {
  categories,
  formatSignedCurrency,
  TransactionStatus,
} from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

type DateRange = 'all' | '30' | '90';
type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

const getTimestamp = (date: string) => {
  const parsed = new Date(date).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const getStatusLabel = (status: TransactionStatus) => {
  if (status === 'Approved') {
    return 'Cleared';
  }

  return status;
};

export const TransactionsReview = () => {
  const { addTransaction, transactions } = useFinanceData();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const latestTimestamp = Math.max(
      ...transactions.map((transaction) => getTimestamp(transaction.date)),
      0,
    );
    const maxAgeMs =
      dateRange === 'all'
        ? Number.POSITIVE_INFINITY
        : Number(dateRange) * 24 * 60 * 60 * 1000;

    return transactions
      .filter((transaction) => {
        const matchesQuery =
          !normalizedQuery ||
          `${transaction.merchant} ${transaction.description}`
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesCategory =
          categoryFilter === 'All' || transaction.category === categoryFilter;
        const timestamp = getTimestamp(transaction.date);
        const matchesDate =
          dateRange === 'all' ||
          (timestamp > 0 && latestTimestamp - timestamp <= maxAgeMs);

        return matchesQuery && matchesCategory && matchesDate;
      })
      .toSorted((left, right) => {
        if (sortKey === 'oldest') {
          return getTimestamp(left.date) - getTimestamp(right.date);
        }

        if (sortKey === 'amount-high') {
          return right.amount - left.amount;
        }

        if (sortKey === 'amount-low') {
          return left.amount - right.amount;
        }

        return getTimestamp(right.date) - getTimestamp(left.date);
      });
  }, [categoryFilter, dateRange, query, sortKey, transactions]);

  const visibleTransactions = filteredTransactions.slice(0, 8);

  const addManualTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const amount = Number(data.get('amount'));
    const type = data.get('type');

    addTransaction({
      date: String(data.get('date')),
      merchant: String(data.get('merchant')),
      description: String(data.get('description') ?? ''),
      category: String(data.get('category')),
      amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
    });

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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
                    Merchant
                    <input
                      required
                      name="merchant"
                      className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Description
                    <input
                      name="description"
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
                        {categories.map((category) => (
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
          }
        />

        <search className="grid gap-3 border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-3 sm:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
          <label className="relative min-w-0">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <span className="sr-only">Search merchant</span>
            <input
              className="min-h-10 w-full rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] pl-9 pr-3 text-sm"
              placeholder="Search merchant..."
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
              {['All', ...categories].map((category) => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
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
                setDateRange(event.target.value as DateRange)
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
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount High</option>
              <option value="amount-low">Amount Low</option>
            </select>
          </label>
        </search>

        <section className="flex min-h-[34rem] flex-col overflow-clip border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <caption className="sr-only">Transactions list</caption>
              <thead className="bg-[hsl(var(--surface-low))]">
                <tr className="border-b border-[hsl(var(--outline-variant))]">
                  {['Date', 'Merchant', 'Category', 'Amount', 'Status'].map(
                    (header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr
                    key={`${transaction.id}-${transaction.date}`}
                    className="border-b border-[hsl(var(--outline-variant))] last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                      {transaction.date}
                    </td>
                    <th scope="row" className="px-4 py-3 font-medium">
                      {transaction.merchant}
                    </th>
                    <td className="px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                      {transaction.category}
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
                      <span className="inline-flex rounded-full bg-[hsl(var(--surface-high))] px-2.5 py-1 text-xs font-medium">
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex shrink-0 items-center justify-between border-t border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-4 py-3 text-xs text-[hsl(var(--on-surface-variant))]">
            <span>
              Showing {visibleTransactions.length} of{' '}
              {filteredTransactions.length}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))]"
                disabled
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                <span className="sr-only">Previous page</span>
              </button>
              <button
                type="button"
                className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))]"
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
