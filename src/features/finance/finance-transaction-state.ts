import { FinanceTransaction } from './data';
import { applyManualCategory } from './finance-import-state';

export type ManualTransactionInput = {
  amount: number;
  category: string;
  date: string;
  description: string;
};

export type AddTransactionResult = {
  message: string;
  status: 'duplicate' | 'saved';
};

export type TransactionDetailsInput = {
  category: string;
  note: string;
};

export const createManualTransaction = (
  input: ManualTransactionInput,
  now = Date.now(),
): FinanceTransaction => ({
  amount: input.amount,
  categorizationSource: 'manual',
  category: input.category,
  confidence: 100,
  date: input.date,
  description: input.description.trim(),
  direction: input.amount < 0 ? 'DB' : 'CR',
  id: `manual-${now}`,
  status: 'Approved',
});

export const getDuplicateManualTransactionMessage = (
  transaction: Pick<FinanceTransaction, 'date' | 'description'>,
) =>
  `Duplicate transaction not saved. It matches ${transaction.description} on ${transaction.date}.`;

export const updateCategoryDraft = (
  currentDrafts: Record<string, string>,
  transaction: Pick<FinanceTransaction, 'category'> | undefined,
  id: string,
  category: string,
) => {
  if (!transaction || transaction.category === category) {
    const next = { ...currentDrafts };

    delete next[id];

    return next;
  }

  return {
    ...currentDrafts,
    [id]: category,
  };
};

export const clearDraftCategories = (
  currentDrafts: Record<string, string>,
  ids: string[],
) => {
  const next = { ...currentDrafts };

  ids.forEach((id) => {
    delete next[id];
  });

  return next;
};

export const applyBulkTransactionCategory = (
  transactions: FinanceTransaction[],
  ids: string[],
  category: string,
) => {
  const idSet = new Set(ids);

  return transactions.map((transaction) =>
    idSet.has(transaction.id)
      ? applyManualCategory(
          transaction,
          category,
          'Category changed during bulk transaction review.',
        )
      : transaction,
  );
};

export const applyTransactionDetails = (
  transaction: FinanceTransaction,
  details: TransactionDetailsInput,
): FinanceTransaction => {
  const categoryChanged = details.category !== transaction.category;
  const needsReview = details.category === 'Uncategorized';

  return {
    ...transaction,
    aiReason: categoryChanged
      ? 'Category changed during transaction review.'
      : transaction.aiReason,
    categorizationSource: categoryChanged
      ? 'manual'
      : transaction.categorizationSource,
    category: details.category,
    confidence: categoryChanged
      ? needsReview
        ? Math.min(transaction.confidence, 31)
        : 100
      : transaction.confidence,
    note: details.note,
    status: needsReview ? 'Review' : transaction.status,
  };
};
