import {
  FinanceTransaction,
  TransactionDirection,
} from '@/features/finance/data';

const normalizeDuplicateDate = (date: string) => {
  const timestamp = new Date(date).getTime();

  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp).toISOString().slice(0, 10);
  }

  return date.trim().toLocaleLowerCase();
};

const normalizeDuplicateDescription = (description: string) =>
  description.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const normalizeDuplicateAmount = (amount: number) =>
  Math.abs(amount).toFixed(2);

export const normalizeTransactionDirection = (
  direction: unknown,
  amount: number,
): TransactionDirection => {
  if (direction === 'CR' || direction === 'DB') {
    return direction;
  }

  return amount < 0 ? 'DB' : 'CR';
};

export const getTransactionDirection = (
  transaction: Pick<FinanceTransaction, 'amount' | 'direction'>,
) => normalizeTransactionDirection(transaction.direction, transaction.amount);

export const getTransactionDuplicateKey = (
  transaction: Pick<
    FinanceTransaction,
    'amount' | 'date' | 'description' | 'direction'
  >,
) =>
  [
    normalizeDuplicateDate(transaction.date),
    normalizeDuplicateDescription(transaction.description),
    normalizeDuplicateAmount(transaction.amount),
    getTransactionDirection(transaction),
  ].join('|');

export const isDuplicateTransaction = (
  transaction: Pick<FinanceTransaction, 'status'>,
) => transaction.status === 'Duplicate';

export const isSaveableTransaction = (
  transaction: Pick<FinanceTransaction, 'status'>,
) => !isDuplicateTransaction(transaction);

export const markDuplicateTransaction = (
  transaction: FinanceTransaction,
): FinanceTransaction => ({
  ...transaction,
  aiReason:
    'Duplicate detected by date, description, amount, and CR/DB direction. This row will not be saved again.',
  confidence: 100,
  status: 'Duplicate',
});

export const markDuplicateTransactions = (
  transactions: FinanceTransaction[],
  existingTransactions: FinanceTransaction[],
) => {
  const seenKeys = new Set(
    existingTransactions.map((transaction) =>
      getTransactionDuplicateKey(transaction),
    ),
  );

  return transactions.map((transaction) => {
    const key = getTransactionDuplicateKey(transaction);
    const isDuplicate = seenKeys.has(key);

    seenKeys.add(key);

    return isDuplicate ? markDuplicateTransaction(transaction) : transaction;
  });
};
