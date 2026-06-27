import { Calendar, Search, SlidersHorizontal } from 'lucide-react';

import {
  allCategoriesFilter,
  TransactionDateRange,
  TransactionSortKey,
} from '@/features/finance/transaction-review-utils';

type TransactionsFilterBarProps = {
  categories: string[];
  categoryFilter: string;
  dateRange: TransactionDateRange;
  onCategoryFilterChange: (category: string) => void;
  onDateRangeChange: (range: TransactionDateRange) => void;
  onQueryChange: (query: string) => void;
  onSortKeyChange: (sortKey: TransactionSortKey) => void;
  query: string;
  sortKey: TransactionSortKey;
};

const controlClassName =
  'min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] text-sm';

export const TransactionsFilterBar = ({
  categories,
  categoryFilter,
  dateRange,
  onCategoryFilterChange,
  onDateRangeChange,
  onQueryChange,
  onSortKeyChange,
  query,
  sortKey,
}: TransactionsFilterBarProps) => {
  return (
    <search className="animate-enter grid gap-3 rounded-2xl border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.82)] p-3 shadow-sm backdrop-blur-xl sm:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
      <label className="relative min-w-0">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <span className="sr-only">Search transaction details</span>
        <input
          className={`${controlClassName} w-full pl-9 pr-3`}
          placeholder="Search details..."
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label>
        <span className="sr-only">Category filter</span>
        <select
          className={`${controlClassName} px-3`}
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
        >
          {[allCategoriesFilter, ...categories].map((category) => (
            <option key={category} value={category}>
              {category === allCategoriesFilter ? 'All Categories' : category}
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
          className={`${controlClassName} pl-9 pr-3`}
          value={dateRange}
          onChange={(event) =>
            onDateRangeChange(event.target.value as TransactionDateRange)
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
          className={`${controlClassName} pl-9 pr-3`}
          value={sortKey}
          onChange={(event) =>
            onSortKeyChange(event.target.value as TransactionSortKey)
          }
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount-high">Amount High</option>
          <option value="amount-low">Amount Low</option>
        </select>
      </label>
    </search>
  );
};
