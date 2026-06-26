import { FinanceTransaction } from './data';

export type TransactionDateRange = 'all' | '30' | '90';
export type TransactionSortKey =
  | 'newest'
  | 'oldest'
  | 'amount-high'
  | 'amount-low';

export type TransactionReviewFilters = {
  categoryFilter: string;
  dateRange: TransactionDateRange;
  draftCategories: Record<string, string>;
  query: string;
  sortKey: TransactionSortKey;
};

export type TransactionReviewSummary = {
  expenseCount: number;
  filteredCount: number;
  totalBalance: number;
};

export const allCategoriesFilter = 'All';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export const getTransactionTimestamp = (date: string) => {
  const parsed = new Date(date).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const getEffectiveCategory = (
  transaction: FinanceTransaction,
  draftCategories: Record<string, string>,
) => draftCategories[transaction.id] ?? transaction.category;

const getLatestTransactionTimestamp = (transactions: FinanceTransaction[]) =>
  transactions.reduce(
    (latest, transaction) =>
      Math.max(latest, getTransactionTimestamp(transaction.date)),
    0,
  );

const isWithinDateRange = (
  transaction: FinanceTransaction,
  latestTimestamp: number,
  dateRange: TransactionDateRange,
) => {
  if (dateRange === 'all') {
    return true;
  }

  const timestamp = getTransactionTimestamp(transaction.date);
  const maxAgeMs = Number(dateRange) * millisecondsPerDay;

  return timestamp > 0 && latestTimestamp - timestamp <= maxAgeMs;
};

const compareTransactions = (
  sortKey: TransactionSortKey,
  left: FinanceTransaction,
  right: FinanceTransaction,
) => {
  if (sortKey === 'oldest') {
    return (
      getTransactionTimestamp(left.date) - getTransactionTimestamp(right.date)
    );
  }

  if (sortKey === 'amount-high') {
    return right.amount - left.amount;
  }

  if (sortKey === 'amount-low') {
    return left.amount - right.amount;
  }

  return (
    getTransactionTimestamp(right.date) - getTransactionTimestamp(left.date)
  );
};

export const getFilteredTransactions = (
  transactions: FinanceTransaction[],
  filters: TransactionReviewFilters,
) => {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const latestTimestamp = getLatestTransactionTimestamp(transactions);

  return transactions
    .filter((transaction) => {
      const category = getEffectiveCategory(
        transaction,
        filters.draftCategories,
      );
      const matchesQuery =
        !normalizedQuery ||
        transaction.description.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        filters.categoryFilter === allCategoriesFilter ||
        category === filters.categoryFilter;
      const matchesDate = isWithinDateRange(
        transaction,
        latestTimestamp,
        filters.dateRange,
      );

      return matchesQuery && matchesCategory && matchesDate;
    })
    .toSorted((left, right) =>
      compareTransactions(filters.sortKey, left, right),
    );
};

export const getTransactionReviewSummary = (
  transactions: FinanceTransaction[],
): TransactionReviewSummary => ({
  expenseCount: transactions.filter((transaction) => transaction.amount < 0)
    .length,
  filteredCount: transactions.length,
  totalBalance: transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  ),
});
