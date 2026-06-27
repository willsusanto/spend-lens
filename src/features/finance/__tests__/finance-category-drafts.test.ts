import { describe, expect, test } from 'vitest';

import { FinanceTransaction, ImportBatch } from '@/features/finance/data';
import {
  applyCategoryDraftEntries,
  applyManualCategory,
  applyStagedCategoryDraftsToActiveImport,
  applyStagedCategoryDraftsToImports,
  clearAppliedCategoryDrafts,
  getAffectedStagedImportIds,
} from '@/features/finance/finance-category-drafts';

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

describe('finance category draft helpers', () => {
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

  test('applies and clears category drafts by matching entries', () => {
    const unchanged = createTransaction({ id: 'unchanged' });
    const changed = createTransaction({
      category: 'Uncategorized',
      confidence: 31,
      id: 'changed',
      status: 'Review',
    });
    const entries: [string, string][] = [['changed', 'Groceries']];

    expect(
      applyCategoryDraftEntries(
        [unchanged, changed],
        entries,
        'Category changed during test.',
      ),
    ).toMatchObject([
      { id: 'unchanged', status: 'Pending' },
      {
        aiReason: 'Category changed during test.',
        category: 'Groceries',
        confidence: 100,
        id: 'changed',
        status: 'Pending',
      },
    ]);

    expect(
      clearAppliedCategoryDrafts(
        {
          changed: 'Groceries',
          retained: 'Bills',
        },
        entries,
      ),
    ).toEqual({ retained: 'Bills' });
  });

  test('updates staged category drafts across import state', () => {
    const changed = createTransaction({
      category: 'Uncategorized',
      confidence: 31,
      id: 'changed',
      status: 'Review',
    });
    const unrelated = createTransaction({
      id: 'unrelated',
      importId: 'import-1718812800000',
    });
    const entries: [string, string][] = [['changed', 'Groceries']];
    const activeImport = {
      activeImportId: importId,
      fileName: 'bank.csv',
      finalBatchStatus: 'Review' as const,
      isComplete: true,
      isProcessing: false,
      message: null,
      processedRows: 1,
      processedTransactions: [changed],
      totalRows: 1,
    };
    const affectedImportIds = getAffectedStagedImportIds({
      activeImport,
      entries,
      stagedTransactions: [changed, unrelated],
    });
    const updatedStagedTransactions = applyCategoryDraftEntries(
      [changed, unrelated],
      entries,
      'Category changed during import staging.',
    );

    expect(Array.from(affectedImportIds)).toEqual([importId]);
    expect(
      applyStagedCategoryDraftsToImports({
        affectedImportIds,
        imports: [
          createImport({ id: importId, rows: 1, status: 'Review' }),
          createImport({
            id: 'import-1718812800000',
            rows: 1,
            status: 'Pending',
          }),
        ],
        stagedTransactions: updatedStagedTransactions,
      }),
    ).toMatchObject([
      { id: importId, status: 'Pending' },
      { id: 'import-1718812800000', status: 'Pending' },
    ]);

    expect(
      applyStagedCategoryDraftsToActiveImport(activeImport, entries)
        .processedTransactions,
    ).toMatchObject([
      {
        category: 'Groceries',
        confidence: 100,
        id: 'changed',
        status: 'Pending',
      },
    ]);
  });
});
