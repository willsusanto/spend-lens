import { describe, expect, test } from 'vitest';

import { FinanceTransaction, ImportBatch } from '@/features/finance/data';
import {
  applyStagedDeletionToActiveImport,
  applyStagedDeletionToImports,
  createImportConfirmation,
  createStagedDeletionPlan,
  ensureImportsForStagedTransactions,
  getImportBatchStatus,
  getImportBatchStatusAfterDeletion,
  getRemainingImportBatchStatus,
  restoreActiveImportFromStaged,
} from '@/features/finance/finance-import-state';

const importId = 'import-1718726400000';

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
  fileName: 'bank.csv',
  id: importId,
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

  test('plans staged row deletion and updates import state', () => {
    const deleted = createTransaction({ id: 'deleted' });
    const kept = createTransaction({ id: 'kept' });
    const duplicate = createTransaction({
      id: 'duplicate',
      status: 'Duplicate',
    });
    const plan = createStagedDeletionPlan(
      [deleted, kept, duplicate],
      ['deleted', 'duplicate'],
    );

    expect(plan.status).toBe('ready');

    if (plan.status !== 'ready') {
      throw new Error('Expected deletion plan to be ready.');
    }

    expect(plan.deletedMessage).toBe('Deleted 2 import rows.');
    expect(plan.remainingStagedTransactions.map((item) => item.id)).toEqual([
      'kept',
    ]);

    expect(
      applyStagedDeletionToImports(
        [createImport({ duplicateRows: 1, rows: 3, status: 'Review' })],
        plan,
      )[0],
    ).toMatchObject({
      duplicateRows: 0,
      rows: 1,
      status: 'Pending',
    });

    expect(
      applyStagedDeletionToActiveImport(
        {
          activeImportId: importId,
          fileName: 'bank.csv',
          finalBatchStatus: 'Review',
          isComplete: true,
          isProcessing: false,
          message: null,
          processedRows: 3,
          processedTransactions: [deleted, kept, duplicate],
          totalRows: 3,
        },
        plan,
      ),
    ).toMatchObject({
      finalBatchStatus: 'Pending',
      message: 'Deleted 2 import rows.',
      processedRows: 1,
      processedTransactions: [kept],
      totalRows: 1,
    });
  });

  test('blocks staged deletion when duplicate-only selection has no duplicates', () => {
    expect(
      createStagedDeletionPlan(
        [createTransaction({ id: 'ready' })],
        ['ready'],
        { duplicateOnly: true },
      ),
    ).toEqual({
      message: 'No duplicate import rows selected for deletion.',
      status: 'empty',
    });
  });

  test('creates import confirmation results', () => {
    expect(
      createImportConfirmation(
        [
          createTransaction({
            category: 'Uncategorized',
            confidence: 31,
            id: 'review',
            status: 'Review',
          }),
        ],
        importId,
      ),
    ).toEqual({
      message: 'Categorize every imported transaction before confirming.',
      status: 'needs-review',
    });

    const result = createImportConfirmation(
      [
        createTransaction({ id: 'ready' }),
        createTransaction({ id: 'duplicate', status: 'Duplicate' }),
      ],
      importId,
    );

    expect(result.status).toBe('ready');

    if (result.status !== 'ready') {
      throw new Error('Expected confirmation to be ready.');
    }

    expect(result.confirmedTransactions).toMatchObject([
      { id: 'ready', status: 'Approved' },
    ]);
    expect(result.duplicateTransactions).toHaveLength(1);
    expect(result.finalStatus).toBe('Approved');
    expect(result.finalMessage).toBe(
      'Committed 1 non-duplicate transaction to the transaction table. 1 duplicate row skipped.',
    );
  });

  test('restores the latest unresolved active import', () => {
    const active = restoreActiveImportFromStaged(
      [
        createImport({
          id: 'import-1718899200000',
          rows: 1,
          status: 'Review',
        }),
        createImport({
          id: 'import-1718726400000',
          rows: 1,
          status: 'Review',
        }),
        createImport({
          id: 'import-1718812800000',
          rows: 1,
          status: 'Review',
        }),
      ],
      [
        createTransaction({
          id: 'older-review-row',
          importId: 'import-1718726400000',
        }),
        createTransaction({
          id: 'review-row',
          importId: 'import-1718812800000',
          sourceFile: 'later-bank.csv',
        }),
        createTransaction({
          id: 'latest-review-row',
          importId: 'import-1718899200000',
          sourceFile: 'latest-bank.csv',
        }),
      ],
    );

    expect(active).toMatchObject({
      activeImportId: 'import-1718899200000',
      fileName: 'bank.csv',
      finalBatchStatus: 'Review',
      isComplete: true,
      processedRows: 1,
      totalRows: 1,
    });
    expect(active.processedTransactions[0].id).toBe('latest-review-row');
  });
});
