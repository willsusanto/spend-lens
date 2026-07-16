import { describe, expect, test } from 'vitest';

import { parseTransactionsCsv } from '@/features/finance/csv';

describe('parseTransactionsCsv', () => {
  test('parses accounting negatives and comma/dot amount formats', () => {
    const csv = [
      'date,description,amount,direction',
      '2026-06-18,Accounting negative,"(1,234.56)",DB',
      '2026-06-19,Indonesian credit,"1.234,56",CR',
      '2026-06-20,Thousands debit,"1,234",DB',
    ].join('\n');

    const { transactions } = parseTransactionsCsv(csv, 'bank.csv');

    expect(transactions).toMatchObject([
      {
        amount: -1234.56,
        description: 'Accounting negative',
        direction: 'DB',
      },
      {
        amount: 1234.56,
        description: 'Indonesian credit',
        direction: 'CR',
      },
      {
        amount: -1234,
        description: 'Thousands debit',
        direction: 'DB',
      },
    ]);
  });
});
