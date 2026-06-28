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

const normalizeDuplicateSourceFile = (sourceFile: string | undefined) =>
  sourceFile?.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ?? null;

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

const hasMatchingDuplicateSource = (
  transaction: Pick<FinanceTransaction, 'sourceFile'>,
  existingTransaction: Pick<FinanceTransaction, 'sourceFile'>,
) => {
  const sourceFile = normalizeDuplicateSourceFile(transaction.sourceFile);
  const existingSourceFile = normalizeDuplicateSourceFile(
    existingTransaction.sourceFile,
  );

  return (
    !sourceFile || !existingSourceFile || sourceFile === existingSourceFile
  );
};

const isMatchingDuplicateCandidate = (
  transaction: Pick<
    FinanceTransaction,
    'amount' | 'date' | 'description' | 'direction' | 'sourceFile'
  >,
  existingTransaction: FinanceTransaction,
) =>
  getTransactionDuplicateKey(existingTransaction) ===
    getTransactionDuplicateKey(transaction) &&
  hasMatchingDuplicateSource(transaction, existingTransaction);

export const findDuplicateTransaction = (
  transaction: Pick<
    FinanceTransaction,
    'amount' | 'date' | 'description' | 'direction' | 'sourceFile'
  >,
  existingTransactions: FinanceTransaction[],
) => {
  return existingTransactions.find((existingTransaction) =>
    isMatchingDuplicateCandidate(transaction, existingTransaction),
  );
};

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
  return transactions.map((transaction) =>
    findDuplicateTransaction(transaction, existingTransactions)
      ? markDuplicateTransaction(transaction)
      : transaction,
  );
};
