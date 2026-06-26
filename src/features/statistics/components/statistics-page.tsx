'use client';

import { BarChart3, PieChart, ReceiptText, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { formatCurrency } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import {
  CategorySlice,
  CategorySort,
  formatPercentage,
  getCategoryBreakdown,
  getCountBreakdown,
  getDonutSegmentPath,
  getSliceLabel,
  sortCategorySlices,
} from '@/features/statistics/statistics-breakdown';
import { cn } from '@/utils/cn';

const DonutChart = ({
  emptyLabel,
  label,
  slices,
  totalLabel,
}: {
  emptyLabel: string;
  label: string;
  slices: CategorySlice[];
  totalLabel: string;
}) => {
  const [hoveredSliceName, setHoveredSliceName] = useState<string | null>(null);
  const hoveredSlice =
    slices.find((slice) => slice.name === hoveredSliceName) ?? null;
  let offset = 0;

  return (
    <Panel className="grid gap-5 p-5">
      <div className="flex items-center gap-2">
        <PieChart className="size-5" aria-hidden="true" />
        <h2 className="text-base font-semibold">{label}</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto grid aspect-square w-full max-w-56 place-items-center">
          <svg
            aria-label={label}
            className="size-full overflow-visible rounded-full"
            role="img"
            viewBox="0 0 120 120"
          >
            <circle
              aria-hidden="true"
              cx="60"
              cy="60"
              fill="none"
              r="46"
              stroke="hsl(var(--surface-high))"
              strokeWidth="18"
            />
            {slices.length > 0
              ? slices.map((slice) => {
                  const start = offset;
                  const end = offset + slice.percentage;
                  const isHovered = hoveredSliceName === slice.name;
                  const hasHover = hoveredSliceName !== null;

                  offset = end;

                  return (
                    <path
                      key={slice.name}
                      aria-label={getSliceLabel(slice)}
                      className={cn(
                        'cursor-pointer outline-none transition-[opacity,filter] duration-150 focus-visible:stroke-1 focus-visible:stroke-[hsl(var(--foreground))]',
                        hasHover && !isHovered && 'opacity-35',
                        isHovered && 'drop-shadow-sm [filter:brightness(1.08)]',
                      )}
                      d={getDonutSegmentPath(start, end)}
                      fill={slice.color}
                      fillRule="evenodd"
                      role="button"
                      tabIndex={0}
                      onBlur={() => setHoveredSliceName(null)}
                      onFocus={() => setHoveredSliceName(slice.name)}
                      onPointerEnter={() => setHoveredSliceName(slice.name)}
                      onPointerLeave={() => setHoveredSliceName(null)}
                    />
                  );
                })
              : null}
          </svg>
          <div className="pointer-events-none absolute inset-[21%] grid place-items-center rounded-full border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] text-center">
            <span className="grid gap-1 px-3 text-sm font-semibold leading-5">
              <span className="truncate">
                {hoveredSlice
                  ? formatPercentage(hoveredSlice.percentage)
                  : slices.length > 0
                    ? totalLabel
                    : emptyLabel}
              </span>
              {hoveredSlice ? (
                <span className="text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                  {hoveredSlice.name}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="grid gap-2 p-1">
          {slices.length > 0 ? (
            slices.map((slice) => {
              const isHovered = hoveredSliceName === slice.name;
              const hasHover = hoveredSliceName !== null;

              return (
                <button
                  key={slice.name}
                  type="button"
                  className={cn(
                    'grid min-h-9 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded px-2 text-left text-sm transition-colors',
                    hasHover && !isHovered && 'opacity-55',
                    isHovered &&
                      'bg-[hsl(var(--surface-low))] text-[hsl(var(--foreground))] ring-1 ring-inset ring-[hsl(var(--outline-variant))]',
                  )}
                  onBlur={() => setHoveredSliceName(null)}
                  onFocus={() => setHoveredSliceName(slice.name)}
                  onPointerEnter={() => setHoveredSliceName(slice.name)}
                  onPointerLeave={() => setHoveredSliceName(null)}
                >
                  <span
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.name}</span>
                  <span className="font-mono text-xs text-[hsl(var(--on-surface-variant))]">
                    {formatPercentage(slice.percentage)}%
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-[hsl(var(--on-surface-variant))]">
              No transactions available.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
};

const CategoryBars = ({
  onSortChange,
  slices,
  sort,
}: {
  onSortChange: (sort: CategorySort) => void;
  slices: CategorySlice[];
  sort: CategorySort;
}) => (
  <Panel>
    <PanelHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="size-5" aria-hidden="true" />
          Category Spending
        </h2>
        <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
          Expense share by category.
        </p>
      </div>
      <label className="grid gap-1 text-xs font-medium text-[hsl(var(--on-surface-variant))] sm:w-44">
        Sort
        <select
          className="min-h-9 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-2 text-sm text-[hsl(var(--foreground))]"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as CategorySort)}
        >
          <option value="high">Highest first</option>
          <option value="low">Lowest first</option>
        </select>
      </label>
    </PanelHeader>

    <div className="grid gap-4 p-5">
      {slices.length > 0 ? (
        slices.map((slice) => (
          <div key={slice.name} className="grid gap-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="min-w-0 truncate font-medium">{slice.name}</span>
              <span className="shrink-0 font-mono text-xs text-[hsl(var(--on-surface-variant))]">
                {formatPercentage(slice.percentage)}% -{' '}
                {formatCurrency(slice.amount)}
              </span>
            </div>
            <div className="h-3 overflow-clip rounded bg-[hsl(var(--surface-high))]">
              <div
                className="h-full min-w-1 rounded"
                style={{
                  backgroundColor: slice.color,
                  inlineSize: `${Math.max(slice.percentage, 1)}%`,
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-[hsl(var(--on-surface-variant))]">
          No expense transactions available.
        </p>
      )}
    </div>
  </Panel>
);

const MetricPanel = ({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: typeof ReceiptText;
  label: string;
  value: string;
}) => (
  <Panel className="grid gap-3 p-5">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-sm font-medium text-[hsl(var(--on-surface-variant))]">
        {label}
      </h2>
      <Icon className="size-5 text-[hsl(var(--on-surface-variant))]" />
    </div>
    <p className="text-2xl font-semibold leading-8">{value}</p>
    <p className="text-xs text-[hsl(var(--on-surface-variant))]">{helper}</p>
  </Panel>
);

export const StatisticsPage = () => {
  const { hydrated, transactions } = useFinanceData();
  const [categorySort, setCategorySort] = useState<CategorySort>('high');
  const expenseTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.amount < 0),
    [transactions],
  );
  const expenseSlices = useMemo(
    () =>
      getCategoryBreakdown(expenseTransactions, (transaction) =>
        Math.abs(transaction.amount),
      ),
    [expenseTransactions],
  );
  const countSlices = useMemo(
    () => getCountBreakdown(transactions),
    [transactions],
  );
  const sortedExpenseSlices = useMemo(
    () => sortCategorySlices(expenseSlices, categorySort),
    [categorySort, expenseSlices],
  );
  const totalSpending = expenseTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );
  const totalIncome = transactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const largestCategory = expenseSlices[0];
  const reviewedCount = transactions.filter(
    (transaction) => transaction.status === 'Approved',
  ).length;

  if (!hydrated) {
    return (
      <FinanceAppShell>
        <PageContainer>
          <Panel as="p" className="px-4 py-3 text-sm">
            Loading statistics...
          </Panel>
        </PageContainer>
      </FinanceAppShell>
    );
  }

  return (
    <FinanceAppShell>
      <PageContainer flow="space" className="max-w-6xl pt-3 sm:pt-6">
        <PageHeader
          title="Statistics"
          description="Category mix and spending distribution for your local ledger."
        />

        <section className="grid gap-3 md:grid-cols-3">
          <MetricPanel
            helper={`${expenseTransactions.length} expense transactions`}
            icon={WalletCards}
            label="Total Spending"
            value={formatCurrency(totalSpending)}
          />
          <MetricPanel
            helper={
              largestCategory
                ? `${formatPercentage(largestCategory.percentage)}% of spending`
                : 'No category activity yet'
            }
            icon={PieChart}
            label="Largest Category"
            value={largestCategory?.name ?? 'None'}
          />
          <MetricPanel
            helper={`${reviewedCount} approved transactions`}
            icon={ReceiptText}
            label="Total Income"
            value={formatCurrency(totalIncome)}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <DonutChart
            emptyLabel="No spending"
            label="Spending Share"
            slices={expenseSlices}
            totalLabel={formatCurrency(totalSpending)}
          />
          <DonutChart
            emptyLabel="No activity"
            label="Transaction Share"
            slices={countSlices}
            totalLabel={`${transactions.length} rows`}
          />
        </section>

        <CategoryBars
          slices={sortedExpenseSlices}
          sort={categorySort}
          onSortChange={setCategorySort}
        />

        {sortedExpenseSlices.length > 0 ? (
          <Panel clipped>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Category spending percentages
                </caption>
                <thead className="bg-[hsl(var(--surface-low))]">
                  <tr className="border-b border-[hsl(var(--outline-variant))]">
                    {['Category', 'Transactions', 'Spending', 'Share'].map(
                      (header) => (
                        <th
                          key={header}
                          scope="col"
                          className={cn(
                            'px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]',
                            header !== 'Category' && 'text-right',
                          )}
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenseSlices.map((slice) => (
                    <tr
                      key={slice.name}
                      className="border-b border-[hsl(var(--outline-variant))] last:border-b-0"
                    >
                      <th scope="row" className="px-4 py-3 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-3 rounded-sm"
                            style={{ backgroundColor: slice.color }}
                          />
                          {slice.name}
                        </span>
                      </th>
                      <td className="px-4 py-3 text-right">{slice.count}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCurrency(slice.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatPercentage(slice.percentage)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}
      </PageContainer>
    </FinanceAppShell>
  );
};
