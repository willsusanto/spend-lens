import { describe, expect, test } from 'vitest';

import { FinanceTransaction } from '@/features/finance/data';
import {
  applyBulkTransactionCategory,
  applyTransactionDetails,
  clearDraftCategories,
  createManualTransaction,
  getDuplicateManualTransactionMessage,
  updateCategoryDraft,
} from '@/features/finance/finance-transaction-state';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -100,
  category: 'Groceries',
  confidence: 88,
  date: 'Jun 18, 2026',
  description: 'Coffee Shop',
  id: 'transaction',
  status: 'Pending',
  ...transaction,
});

describe('finance transaction state helpers', () => {
  test('creates manual transactions with trimmed descriptions and direction', () => {
    expect(
      createManualTransaction(
        {
          amount: -125,
          category: 'Groceries',
          date: '2026-06-18',
          description: '  Market  ',
        },
        123,
      ),
    ).toMatchObject({
      amount: -125,
      categorizationSource: 'manual',
      category: 'Groceries',
      confidence: 100,
      description: 'Market',
      direction: 'DB',
      id: 'manual-123',
      status: 'Approved',
    });

    expect(
      createManualTransaction(
        {
          amount: 125,
          category: 'Income',
          date: '2026-06-18',
          description: 'Refund',
        },
        456,
      ).direction,
    ).toBe('CR');
  });

  test('builds duplicate manual transaction messages', () => {
    expect(
      getDuplicateManualTransactionMessage(
        createTransaction({
          date: '2026-06-18',
          description: 'Coffee Shop',
        }),
      ),
    ).toBe(
      'Duplicate transaction not saved. It matches Coffee Shop on 2026-06-18.',
    );
  });

  test('updates or clears category drafts', () => {
    expect(
      updateCategoryDraft(
        { existing: 'Transport' },
        createTransaction({ category: 'Groceries', id: 'transaction' }),
        'transaction',
        'Transport',
      ),
    ).toEqual({
      existing: 'Transport',
      transaction: 'Transport',
    });

    expect(
      updateCategoryDraft(
        { existing: 'Transport', transaction: 'Transport' },
        createTransaction({ category: 'Groceries', id: 'transaction' }),
        'transaction',
        'Groceries',
      ),
    ).toEqual({
      existing: 'Transport',
    });
  });

  test('clears selected draft categories', () => {
    expect(
      clearDraftCategories({ one: 'A', three: 'C', two: 'B' }, ['two']),
    ).toEqual({
      one: 'A',
      three: 'C',
    });
  });

  test('applies bulk categories and transaction detail edits', () => {
    const [changed, unchanged] = applyBulkTransactionCategory(
      [createTransaction({ id: 'one' }), createTransaction({ id: 'two' })],
      ['one'],
      'Transport',
    );

    expect(changed).toMatchObject({
      aiReason: 'Category changed during bulk transaction review.',
      categorizationSource: 'manual',
      category: 'Transport',
      confidence: 100,
      status: 'Pending',
    });
    expect(unchanged.category).toBe('Groceries');

    expect(
      applyTransactionDetails(createTransaction({ confidence: 88 }), {
        category: 'Uncategorized',
        note: 'Needs receipt',
      }),
    ).toMatchObject({
      aiReason: 'Category changed during transaction review.',
      categorizationSource: 'manual',
      category: 'Uncategorized',
      confidence: 31,
      note: 'Needs receipt',
      status: 'Review',
    });
  });
});
