import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { FinanceTransaction, ImportBatch } from '@/features/finance/data';
import {
  FinanceStore,
  FinanceStoreSnapshot,
} from '@/features/finance/finance-store';
import {
  FinanceDataProvider,
  useFinanceData,
} from '@/features/finance/use-finance-data';
import { FinanceSettingsProvider } from '@/features/finance/use-finance-settings';

const importId = 'import-duplicate-test';

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
  importId,
  sourceFile: 'bank.csv',
  status: 'Pending',
  ...transaction,
});

const createImport = (importBatch: Partial<ImportBatch>): ImportBatch => ({
  date: 'Jun 18, 2026',
  duplicateRows: 1,
  fileName: 'bank.csv',
  id: importId,
  rows: 2,
  status: 'Review',
  ...importBatch,
});

const createStore = (snapshot: FinanceStoreSnapshot): FinanceStore => ({
  load: vi.fn(async () => snapshot),
  saveImports: vi.fn(async () => undefined),
  saveStagedTransactions: vi.fn(async () => undefined),
  saveTransactions: vi.fn(async () => undefined),
});

const createWrapper = (store: FinanceStore) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FinanceSettingsProvider>
      <FinanceDataProvider store={store}>{children}</FinanceDataProvider>
    </FinanceSettingsProvider>
  );

  return Wrapper;
};

describe('useFinanceData import duplicate handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('deletes non-duplicate staged import rows before confirmation', async () => {
    const deleted = createTransaction({
      description: 'Cafe',
      id: 'deleted-transaction',
    });
    const kept = createTransaction({
      description: 'Bookstore',
      id: 'kept-transaction',
    });
    const store = createStore({
      imports: [createImport({ duplicateRows: 0, status: 'Pending' })],
      stagedTransactions: [deleted, kept],
      transactions: [],
    });

    const { result } = renderHook(() => useFinanceData(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.deleteStagedTransactions([deleted.id]);
    });

    expect(result.current.stagedTransactions).toHaveLength(1);
    expect(result.current.stagedTransactions[0].id).toBe(kept.id);
    expect(result.current.activeImport.processedTransactions).toHaveLength(1);
    expect(result.current.activeImport.processedTransactions[0].id).toBe(
      kept.id,
    );
    expect(result.current.imports[0]).toMatchObject({
      duplicateRows: 0,
      rows: 1,
      status: 'Pending',
    });
    expect(result.current.message).toBe('Deleted 1 import row.');

    act(() => {
      result.current.confirmImport(importId);
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].id).toBe(kept.id);
    expect(result.current.transactions[0].status).toBe('Approved');
  });

  test('deletes staged duplicates and commits only non-duplicate import rows', async () => {
    const duplicate = createTransaction({
      id: 'duplicate-transaction',
      status: 'Duplicate',
    });
    const saveable = createTransaction({
      id: 'saveable-transaction',
    });
    const store = createStore({
      imports: [createImport({})],
      stagedTransactions: [duplicate, saveable],
      transactions: [],
    });

    const { result } = renderHook(() => useFinanceData(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.deleteDuplicateStagedTransactions([duplicate.id]);
    });

    expect(result.current.stagedTransactions).toHaveLength(1);
    expect(result.current.stagedTransactions[0].id).toBe(saveable.id);
    expect(result.current.activeImport.processedTransactions).toHaveLength(1);
    expect(result.current.activeImport.processedTransactions[0].id).toBe(
      saveable.id,
    );
    expect(result.current.imports[0]).toMatchObject({
      duplicateRows: 0,
      rows: 1,
      status: 'Pending',
    });

    act(() => {
      result.current.confirmImport(importId);
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].id).toBe(saveable.id);
    expect(result.current.transactions[0].status).toBe('Approved');
    expect(result.current.stagedTransactions).toHaveLength(0);
    expect(result.current.message).toContain(
      'Committed 1 non-duplicate transaction',
    );
  });
});
