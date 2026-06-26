import { describe, expect, test } from 'vitest';

import { FinanceTransaction, ImportBatch } from '@/features/finance/data';
import {
  applyManualCategory,
  ensureImportsForStagedTransactions,
  getImportBatchStatus,
  getImportBatchStatusAfterDeletion,
  getRemainingImportBatchStatus,
  restoreActiveImportFromStaged,
} from '@/features/finance/finance-import-state';

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
  importId: 'import-1718726400000',
  sourceFile: 'bank.csv',
  status: 'Pending',
  ...transaction,
});

const createImport = (importBatch: Partial<ImportBatch>): ImportBatch => ({
  date: 'Jun 18, 2026',
  fileName: 'bank.csv',
  id: 'import-1718726400000',
  rows: 1,
  status: 'Review',
  ...importBatch,
});

describe('finance import state helpers', () => {
  test('derives import status from duplicate and review state', () => {
    expect(
      getImportBatchStatus([
        createTransaction({ id: 'duplicate', status: 'Duplicate' }),
      ]),
    ).toBe('Duplicate');

    expect(getImportBatchStatus([createTransaction({ id: 'ready' })])).toBe(
      'Pending',
    );

    expect(
      getImportBatchStatus([
        createTransaction({
          category: 'Uncategorized',
          confidence: 31,
          id: 'review',
          status: 'Review',
        }),
      ]),
    ).toBe('Review');
  });

  test('keeps deletion status explicit when no rows remain', () => {
    expect(
      getRemainingImportBatchStatus([
        createTransaction({ id: 'ready', status: 'Pending' }),
      ]),
    ).toBe('Pending');

    expect(getRemainingImportBatchStatus([])).toBe('Duplicate');

    expect(
      getImportBatchStatusAfterDeletion(
        [],
        [createTransaction({ id: 'deleted-duplicate', status: 'Duplicate' })],
      ),
    ).toBe('Duplicate');

    expect(
      getImportBatchStatusAfterDeletion(
        [],
        [createTransaction({ id: 'deleted-review', status: 'Review' })],
      ),
    ).toBe('Review');
  });

  test('restores missing imports from staged transactions', () => {
    const restored = ensureImportsForStagedTransactions(
      [],
      [
        createTransaction({ id: 'ready' }),
        createTransaction({ id: 'duplicate', status: 'Duplicate' }),
      ],
    );

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      duplicateRows: 1,
      fileName: 'bank.csv',
      id: 'import-1718726400000',
      rows: 2,
      status: 'Pending',
    });
  });

  test('restores the latest unresolved active import', () => {
    const active = restoreActiveImportFromStaged(
      [
        createImport({
          id: 'import-1718726400000',
          rows: 1,
          status: 'Approved',
        }),
        createImport({
          id: 'import-1718812800000',
          rows: 1,
          status: 'Review',
        }),
      ],
      [
        createTransaction({
          id: 'approved-row',
          importId: 'import-1718726400000',
        }),
        createTransaction({
          id: 'review-row',
          importId: 'import-1718812800000',
          sourceFile: 'later-bank.csv',
        }),
      ],
    );

    expect(active).toMatchObject({
      activeImportId: 'import-1718812800000',
      fileName: 'bank.csv',
      finalBatchStatus: 'Review',
      isComplete: true,
      processedRows: 1,
      totalRows: 1,
    });
    expect(active.processedTransactions[0].id).toBe('review-row');
  });

  test('applies manual category changes consistently', () => {
    const changed = applyManualCategory(
      createTransaction({
        aiReason: 'Existing reason',
        category: 'Groceries',
        confidence: 88,
      }),
      'Uncategorized',
      'Changed by user.',
    );

    expect(changed).toMatchObject({
      aiReason: 'Changed by user.',
      categorizationSource: 'manual',
      category: 'Uncategorized',
      confidence: 31,
      status: 'Review',
    });
  });
});
