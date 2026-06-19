import { beforeEach, describe, expect, test } from 'vitest';

import { FinanceTransaction, ImportBatch } from '@/features/finance/data';
import { localStorageFinanceStore } from '@/features/finance/finance-store';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -100,
  category: 'Groceries',
  confidence: 100,
  date: 'Jun 18, 2026',
  description: 'Coffee Shop',
  direction: 'DB',
  id: 'transaction',
  sourceFile: 'bank.csv',
  status: 'Pending',
  ...transaction,
});

const createImport = (importBatch: Partial<ImportBatch>): ImportBatch => ({
  date: 'Jun 18, 2026',
  duplicateRows: 0,
  fileName: 'bank.csv',
  id: 'import',
  rows: 1,
  status: 'Pending',
  ...importBatch,
});

describe('localStorageFinanceStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('loads legacy LedgerLocal data into the SpendLens namespace', async () => {
    const imports = [createImport({ id: 'legacy-import' })];
    const stagedTransactions = [
      createTransaction({ id: 'legacy-staged-transaction' }),
    ];
    const transactions = [
      createTransaction({ id: 'legacy-ledger-transaction' }),
    ];

    window.localStorage.setItem('ledgerlocal.imports', JSON.stringify(imports));
    window.localStorage.setItem(
      'ledgerlocal.staged-transactions',
      JSON.stringify(stagedTransactions),
    );
    window.localStorage.setItem(
      'ledgerlocal.transactions',
      JSON.stringify(transactions),
    );

    const snapshot = await localStorageFinanceStore.load();

    expect(snapshot.imports).toEqual(imports);
    expect(snapshot.stagedTransactions).toEqual(stagedTransactions);
    expect(snapshot.transactions).toEqual(transactions);
    expect(window.localStorage.getItem('spendlens.imports')).toBe(
      JSON.stringify(imports),
    );
    expect(window.localStorage.getItem('spendlens.staged-transactions')).toBe(
      JSON.stringify(stagedTransactions),
    );
    expect(window.localStorage.getItem('spendlens.transactions')).toBe(
      JSON.stringify(transactions),
    );
  });

  test('writes finance state to the SpendLens namespace', async () => {
    const transaction = createTransaction({ id: 'spendlens-transaction' });

    await localStorageFinanceStore.saveTransactions([transaction]);

    expect(window.localStorage.getItem('spendlens.transactions')).toBe(
      JSON.stringify([transaction]),
    );
    expect(window.localStorage.getItem('ledgerlocal.transactions')).toBeNull();
  });
});
