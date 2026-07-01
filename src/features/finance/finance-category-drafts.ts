import { FinanceTransaction, ImportBatch } from './data';
import { ActiveImport, getImportBatchStatus } from './finance-import-state';

export type CategoryDraftEntry = [string, string];

export const applyManualCategory = (
  transaction: FinanceTransaction,
  category: string,
  reason: string,
): FinanceTransaction => {
  const needsReview = category === 'Uncategorized';

  return {
    ...transaction,
    aiReason: category === transaction.category ? transaction.aiReason : reason,
    categorizationSource: 'manual',
    category,
    confidence: needsReview ? Math.min(transaction.confidence, 31) : 100,
    status: needsReview ? 'Review' : 'Pending',
  };
};

export const applyCategoryDraftEntries = (
  transactions: FinanceTransaction[],
  entries: CategoryDraftEntry[],
  reason: string,
) => {
  if (entries.length === 0) {
    return transactions;
  }

  const entriesById = new Map(entries);

  return transactions.map((transaction) => {
    const category = entriesById.get(transaction.id);

    return category
      ? applyManualCategory(transaction, category, reason)
      : transaction;
  });
};

export const clearAppliedCategoryDrafts = (
  drafts: Record<string, string>,
  entries: CategoryDraftEntry[],
) => {
  const next = { ...drafts };

  entries.forEach(([id, category]) => {
    if (next[id] === category) {
      delete next[id];
    }
  });

  return next;
};

export const getAffectedStagedImportIds = ({
  activeImport,
  entries,
  stagedTransactions,
}: {
  activeImport: ActiveImport;
  entries: CategoryDraftEntry[];
  stagedTransactions: FinanceTransaction[];
}) => {
  const affectedImportIds = new Set<string>();

  entries.forEach(([id]) => {
    const transaction =
      stagedTransactions.find((item) => item.id === id) ??
      activeImport.processedTransactions.find((item) => item.id === id);

    if (transaction?.importId) {
      affectedImportIds.add(transaction.importId);
    }
  });

  if (affectedImportIds.size === 0 && activeImport.activeImportId) {
    affectedImportIds.add(activeImport.activeImportId);
  }

  return affectedImportIds;
};

export const applyStagedCategoryDraftsToImports = ({
  affectedImportIds,
  imports,
  stagedTransactions,
}: {
  affectedImportIds: Set<string>;
  imports: ImportBatch[];
  stagedTransactions: FinanceTransaction[];
}) =>
  imports.map((item) =>
    affectedImportIds.has(item.id)
      ? {
          ...item,
          status: getImportBatchStatus(
            stagedTransactions.filter(
              (transaction) => transaction.importId === item.id,
            ),
          ),
        }
      : item,
  );

export const applyStagedCategoryDraftsToActiveImport = (
  activeImport: ActiveImport,
  entries: CategoryDraftEntry[],
): ActiveImport => {
  const processedTransactions = applyCategoryDraftEntries(
    activeImport.processedTransactions,
    entries,
    'Category changed during import staging.',
  );

  return {
    ...activeImport,
    finalBatchStatus: getImportBatchStatus(processedTransactions),
    processedTransactions,
  };
};
