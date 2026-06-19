import { describe, expect, test } from 'vitest';

import { FinanceTransaction } from '@/features/finance/data';
import {
  findDuplicateTransaction,
  getTransactionDuplicateKey,
  markDuplicateTransactions,
} from '@/features/finance/duplicate-transactions';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -100,
  category: 'Uncategorized',
  confidence: 31,
  date: 'Jun 18, 2026',
  description: 'Coffee Shop',
  direction: 'DB',
  id: 'transaction',
  status: 'Review',
  ...transaction,
});

describe('duplicate transaction detection', () => {
  test('uses date, normalized description, absolute amount, and direction', () => {
    const debit = createTransaction({
      amount: -100,
      description: '  Coffee   Shop ',
      direction: 'DB',
    });
    const matchingDebit = createTransaction({
      amount: -100,
      description: 'coffee shop',
      direction: 'DB',
      id: 'matching-debit',
    });
    const credit = createTransaction({
      amount: 100,
      description: 'coffee shop',
      direction: 'CR',
      id: 'credit',
    });

    expect(getTransactionDuplicateKey(matchingDebit)).toBe(
      getTransactionDuplicateKey(debit),
    );
    expect(getTransactionDuplicateKey(credit)).not.toBe(
      getTransactionDuplicateKey(debit),
    );
  });

  test('marks later rows as duplicate when the signature already exists', () => {
    const existing = createTransaction({ id: 'existing' });
    const imported = createTransaction({ id: 'imported' });
    const [checked] = markDuplicateTransactions([imported], [existing]);

    expect(checked.status).toBe('Duplicate');
    expect(checked.aiReason).toContain('Duplicate detected');
  });

  test('finds an existing matching row for manual transaction checks', () => {
    const existing = createTransaction({ id: 'existing' });
    const manualEntry = createTransaction({
      description: 'coffee shop',
      id: 'manual',
    });

    expect(findDuplicateTransaction(manualEntry, [existing])?.id).toBe(
      'existing',
    );
  });
});
