import { describe, expect, test } from 'vitest';

import { FinanceTransaction, ImportBatch } from '@/features/finance/data';
import {
  fromPostgresFinanceTransactionEntity,
  fromPostgresImportBatchEntity,
  toPostgresFinanceTransactionEntity,
  toPostgresImportBatchEntity,
} from '@/features/finance/postgres-finance-entities';

const importBatch: ImportBatch = {
  date: 'Jun 18, 2026',
  duplicateRows: 2,
  fileName: 'bank.csv',
  id: 'import-1',
  rows: 4,
  status: 'Review',
};

const transaction: FinanceTransaction = {
  aiReason: 'Cafe merchant',
  amount: -12500.5,
  categorizationSource: 'ollama',
  category: 'Eating Out',
  confidence: 88,
  date: 'Jun 18, 2026',
  description: 'Coffee Shop',
  direction: 'DB',
  id: 'transaction-1',
  importId: 'import-1',
  note: 'Morning coffee',
  ollamaModel: 'gemma4:12b',
  sourceFile: 'bank.csv',
  status: 'Pending',
};

describe('postgres finance entities', () => {
  const userId = 'user-123';

  test('maps import batches to normalized postgres entities', () => {
    const entity = toPostgresImportBatchEntity(importBatch, 3, userId);

    expect(entity).toEqual({
      date_label: 'Jun 18, 2026',
      duplicate_rows: 2,
      file_name: 'bank.csv',
      id: 'import-1',
      row_count: 4,
      sort_order: 3,
      status: 'Review',
      user_id: userId,
    });
    expect(fromPostgresImportBatchEntity(entity)).toEqual(importBatch);
  });

  test('maps transactions to normalized postgres entities', () => {
    const entity = toPostgresFinanceTransactionEntity(
      transaction,
      'staged',
      2,
      userId,
    );

    expect(entity).toMatchObject({
      ai_reason: 'Cafe merchant',
      amount: -12500.5,
      categorization_source: 'ollama',
      direction: 'DB',
      import_id: 'import-1',
      sort_order: 2,
      source_file: 'bank.csv',
      transaction_date: 'Jun 18, 2026',
      transaction_state: 'staged',
      user_id: userId,
    });
    expect(fromPostgresFinanceTransactionEntity(entity)).toEqual(transaction);
  });

  test('normalizes stored transaction values when reading entities', () => {
    expect(
      fromPostgresFinanceTransactionEntity({
        ...toPostgresFinanceTransactionEntity(transaction, 'ledger', 0, userId),
        amount: '9000.75',
        categorization_source: 'remote',
        direction: null,
        status: 'Confirmed',
      }),
    ).toMatchObject({
      amount: 9000.75,
      categorizationSource: undefined,
      direction: 'CR',
      status: 'Approved',
    });
  });
});
