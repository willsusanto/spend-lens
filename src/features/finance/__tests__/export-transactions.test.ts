import { describe, expect, test } from 'vitest';

import {
  getTransactionsExportFileName,
  serializeTransactionsCsv,
} from '@/features/finance/export-transactions';

import { FinanceTransaction } from '../data';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -12500,
  category: 'Groceries',
  confidence: 92,
  date: 'Jun 18, 2026',
  description: 'Market',
  direction: 'DB',
  id: 'transaction-1',
  status: 'Approved',
  ...transaction,
});

describe('serializeTransactionsCsv', () => {
  test('exports ledger fields with stable headers', () => {
    const csv = serializeTransactionsCsv([
      createTransaction({
        aiReason: 'Local model matched grocery keyword.',
        categorizationSource: 'ollama',
        ollamaModel: 'gemma4:12b',
        sourceFile: 'bank.csv',
      }),
    ]);

    expect(csv).toBe(
      [
        'Date,Description,Category,Amount,Direction,Status,Confidence,Category Source,Ollama Model,AI Reason,Note,Source File',
        '"Jun 18, 2026",Market,Groceries,-12500,DB,Approved,92,ollama,gemma4:12b,Local model matched grocery keyword.,,bank.csv',
      ].join('\n'),
    );
  });

  test('escapes descriptions and notes for spreadsheet-safe CSV parsing', () => {
    const csv = serializeTransactionsCsv([
      createTransaction({
        description: 'Cafe, "Corner"',
        note: 'receipt saved\nneeds reimbursement',
      }),
    ]);

    expect(csv).toContain('"Cafe, ""Corner"""');
    expect(csv).toContain('"receipt saved\nneeds reimbursement"');
  });
});

describe('getTransactionsExportFileName', () => {
  test('uses an ISO date stamp', () => {
    expect(
      getTransactionsExportFileName(new Date('2026-06-18T09:30:00.000Z')),
    ).toBe('spendlens-transactions-2026-06-18.csv');
  });
});
