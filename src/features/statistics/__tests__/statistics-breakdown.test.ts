import { describe, expect, test } from 'vitest';

import { FinanceTransaction } from '@/features/finance/data';
import {
  formatPercentage,
  getCategoryBreakdown,
  getCountBreakdown,
  getDonutSegmentPath,
  getSliceLabel,
  sortCategorySlices,
} from '@/features/statistics/statistics-breakdown';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -100,
  category: 'Groceries',
  confidence: 100,
  date: 'Jun 18, 2026',
  description: 'Coffee Shop',
  id: 'transaction',
  status: 'Approved',
  ...transaction,
});

describe('statistics breakdown helpers', () => {
  test('groups positive selected values by category', () => {
    const breakdown = getCategoryBreakdown(
      [
        createTransaction({ amount: -100, category: 'Groceries', id: 'one' }),
        createTransaction({ amount: -50, category: 'Groceries', id: 'two' }),
        createTransaction({ amount: -50, category: 'Transport', id: 'three' }),
        createTransaction({ amount: 25, category: 'Income', id: 'income' }),
      ],
      (transaction) =>
        transaction.amount < 0 ? Math.abs(transaction.amount) : 0,
    );

    expect(breakdown.map((slice) => slice.name)).toEqual([
      'Groceries',
      'Transport',
    ]);
    expect(breakdown[0]).toMatchObject({
      amount: 150,
      count: 2,
      percentage: 75,
    });
    expect(breakdown[1]).toMatchObject({
      amount: 50,
      count: 1,
      percentage: 25,
    });
  });

  test('counts all transactions by category', () => {
    const breakdown = getCountBreakdown([
      createTransaction({ category: 'Groceries', id: 'one' }),
      createTransaction({ category: 'Groceries', id: 'two' }),
      createTransaction({ category: 'Transport', id: 'three' }),
    ]);

    expect(breakdown[0]).toMatchObject({
      amount: 2,
      count: 2,
      name: 'Groceries',
      percentage: 66.66666666666666,
    });
    expect(breakdown[1]).toMatchObject({
      amount: 1,
      count: 1,
      name: 'Transport',
      percentage: 33.33333333333333,
    });
  });

  test('formats, labels, and sorts category slices', () => {
    const slices = [
      {
        amount: 25,
        color: 'red',
        count: 1,
        name: 'Transport',
        percentage: 0.5,
      },
      {
        amount: 100,
        color: 'blue',
        count: 2,
        name: 'Groceries',
        percentage: 99.5,
      },
    ];

    expect(formatPercentage(0.5)).toBe('0.5');
    expect(getSliceLabel(slices[0])).toBe('Transport: 0.5%');
    expect(sortCategorySlices(slices, 'high')[0].name).toBe('Groceries');
    expect(sortCategorySlices(slices, 'low')[0].name).toBe('Transport');
  });

  test('builds donut paths for partial and full segments', () => {
    expect(getDonutSegmentPath(0, 25)).toContain('A 54 54 0 0 1');
    expect(getDonutSegmentPath(0, 100)).toBe(
      'M 60 6 A 54 54 0 1 1 59.99 6 Z M 60 24 A 36 36 0 1 0 59.99 24 Z',
    );
  });
});
