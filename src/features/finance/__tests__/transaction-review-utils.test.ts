import { describe, expect, test } from 'vitest';

import { FinanceTransaction } from '@/features/finance/data';
import {
  allCategoriesFilter,
  getFilteredTransactions,
  getTransactionReviewSummary,
} from '@/features/finance/transaction-review-utils';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -100,
  category: 'Groceries',
  confidence: 100,
  date: 'Jun 18, 2026',
  description: 'Market',
  id: 'transaction',
  status: 'Approved',
  ...transaction,
});

describe('getFilteredTransactions', () => {
  const transactions = [
    createTransaction({
      amount: -200,
      category: 'Groceries',
      date: 'Jun 18, 2026',
      description: 'Fresh Market',
      id: 'groceries',
    }),
    createTransaction({
      amount: 500,
      category: 'Income',
      date: 'Jun 01, 2026',
      description: 'Client Payout',
      id: 'income',
    }),
    createTransaction({
      amount: -50,
      category: 'Transport',
      date: 'Feb 01, 2026',
      description: 'Train Ticket',
      id: 'transport',
    }),
  ];

  test('filters by query, selected category, and latest-ledger relative date range', () => {
    const filtered = getFilteredTransactions(transactions, {
      categoryFilter: 'Groceries',
      dateRange: '30',
      draftCategories: {},
      query: 'fresh',
      sortKey: 'newest',
    });

    expect(filtered.map((transaction) => transaction.id)).toEqual([
      'groceries',
    ]);
  });

  test('uses draft categories while filtering before autosave finishes', () => {
    const filtered = getFilteredTransactions(transactions, {
      categoryFilter: 'Bills / Utilities',
      dateRange: 'all',
      draftCategories: {
        transport: 'Bills / Utilities',
      },
      query: '',
      sortKey: 'newest',
    });

    expect(filtered.map((transaction) => transaction.id)).toEqual([
      'transport',
    ]);
  });

  test('sorts by amount without mutating the original ledger order', () => {
    const filtered = getFilteredTransactions(transactions, {
      categoryFilter: allCategoriesFilter,
      dateRange: 'all',
      draftCategories: {},
      query: '',
      sortKey: 'amount-high',
    });

    expect(filtered.map((transaction) => transaction.id)).toEqual([
      'income',
      'transport',
      'groceries',
    ]);
    expect(transactions.map((transaction) => transaction.id)).toEqual([
      'groceries',
      'income',
      'transport',
    ]);
  });
});

describe('getTransactionReviewSummary', () => {
  test('summarizes filtered transactions for the review metric cards', () => {
    expect(
      getTransactionReviewSummary([
        createTransaction({ amount: -250, id: 'expense' }),
        createTransaction({ amount: 1000, id: 'income' }),
      ]),
    ).toEqual({
      expenseCount: 1,
      filteredCount: 2,
      totalBalance: 750,
    });
  });
});
