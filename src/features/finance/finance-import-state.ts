import { FinanceStatus, FinanceTransaction, ImportBatch } from './data';
import {
  isDuplicateTransaction,
  isSaveableTransaction,
} from './duplicate-transactions';

export type ActiveImport = {
  activeImportId: string | null;
  fileName: string | null;
  finalBatchStatus: FinanceStatus | null;
  isComplete: boolean;
  isProcessing: boolean;
  message: string | null;
  processedRows: number;
  processedTransactions: FinanceTransaction[];
  totalRows: number;
};

export const categorizationChunkSize = 1;

export const idleActiveImport: ActiveImport = {
  activeImportId: null,
  fileName: null,
  finalBatchStatus: null,
  isComplete: false,
  isProcessing: false,
  message: null,
  processedRows: 0,
  processedTransactions: [],
  totalRows: 0,
};

export const chunkTransactions = (transactions: FinanceTransaction[]) => {
  const chunks: FinanceTransaction[][] = [];

  for (
    let index = 0;
    index < transactions.length;
    index += categorizationChunkSize
  ) {
    chunks.push(transactions.slice(index, index + categorizationChunkSize));
  }

  return chunks;
};

export const isTransactionCategorized = (transaction: FinanceTransaction) =>
  !isDuplicateTransaction(transaction) &&
  transaction.category !== 'Uncategorized' &&
  transaction.status !== 'Review' &&
  transaction.confidence >= 70;

export const getImportBatchStatus = (
  transactions: FinanceTransaction[],
): FinanceStatus => {
  if (transactions.length > 0 && transactions.every(isDuplicateTransaction)) {
    return 'Duplicate';
  }

  const saveableTransactions = transactions.filter(isSaveableTransaction);

  return saveableTransactions.length > 0 &&
    saveableTransactions.every(isTransactionCategorized)
    ? 'Pending'
    : 'Review';
};

export const getRemainingImportBatchStatus = (
  transactions: FinanceTransaction[],
): FinanceStatus =>
  transactions.length === 0 ? 'Duplicate' : getImportBatchStatus(transactions);

export const getImportBatchStatusAfterDeletion = (
  remainingTransactions: FinanceTransaction[],
  deletedTransactions: FinanceTransaction[],
): FinanceStatus => {
  if (remainingTransactions.length > 0) {
    return getImportBatchStatus(remainingTransactions);
  }

  return deletedTransactions.every(isDuplicateTransaction)
    ? 'Duplicate'
    : 'Review';
};

export type StagedDeletionPlan =
  | {
      message: string;
      status: 'empty';
    }
  | {
      affectedImportIds: Set<string>;
      deletedMessage: string;
      duplicateOnly: boolean;
      remainingStagedTransactions: FinanceTransaction[];
      removableIds: Set<string>;
      removableTransactions: FinanceTransaction[];
      status: 'ready';
    };

export const createStagedDeletionPlan = (
  stagedTransactions: FinanceTransaction[],
  ids: string[],
  options: { duplicateOnly?: boolean } = {},
): StagedDeletionPlan => {
  const duplicateOnly = options.duplicateOnly ?? false;
  const requestedIds = new Set(ids);
  const removableTransactions = stagedTransactions.filter(
    (transaction) =>
      requestedIds.has(transaction.id) &&
      (!duplicateOnly || isDuplicateTransaction(transaction)),
  );

  if (removableTransactions.length === 0) {
    return {
      message: duplicateOnly
        ? 'No duplicate import rows selected for deletion.'
        : 'No import rows selected for deletion.',
      status: 'empty',
    };
  }

  const removableIds = new Set(
    removableTransactions.map((transaction) => transaction.id),
  );
  const affectedImportIds = new Set(
    removableTransactions
      .map((transaction) => transaction.importId)
      .filter((importId): importId is string => Boolean(importId)),
  );

  return {
    affectedImportIds,
    deletedMessage: `Deleted ${removableTransactions.length} ${
      duplicateOnly ? 'duplicate import' : 'import'
    } row${removableTransactions.length === 1 ? '' : 's'}.`,
    duplicateOnly,
    remainingStagedTransactions: stagedTransactions.filter(
      (transaction) => !removableIds.has(transaction.id),
    ),
    removableIds,
    removableTransactions,
    status: 'ready',
  };
};

export const applyStagedDeletionToImports = (
  imports: ImportBatch[],
  plan: Extract<StagedDeletionPlan, { status: 'ready' }>,
) =>
  imports.map((item) => {
    if (!plan.affectedImportIds.has(item.id)) {
      return item;
    }

    const remainingImportTransactions = plan.remainingStagedTransactions.filter(
      (transaction) => transaction.importId === item.id,
    );
    const deletedImportTransactions = plan.removableTransactions.filter(
      (transaction) => transaction.importId === item.id,
    );

    return {
      ...item,
      duplicateRows: remainingImportTransactions.filter(isDuplicateTransaction)
        .length,
      rows: remainingImportTransactions.length,
      status: plan.duplicateOnly
        ? getRemainingImportBatchStatus(remainingImportTransactions)
        : getImportBatchStatusAfterDeletion(
            remainingImportTransactions,
            deletedImportTransactions,
          ),
    };
  });

export const applyStagedDeletionToActiveImport = (
  activeImport: ActiveImport,
  plan: Extract<StagedDeletionPlan, { status: 'ready' }>,
): ActiveImport => {
  if (
    !activeImport.activeImportId ||
    !plan.affectedImportIds.has(activeImport.activeImportId)
  ) {
    return activeImport;
  }

  const remainingProcessedTransactions =
    activeImport.processedTransactions.filter(
      (transaction) => !plan.removableIds.has(transaction.id),
    );
  const removedActiveTransactions = activeImport.processedTransactions.filter(
    (transaction) => plan.removableIds.has(transaction.id),
  );
  const removedActiveRows = removedActiveTransactions.length;

  return {
    ...activeImport,
    finalBatchStatus: plan.duplicateOnly
      ? getRemainingImportBatchStatus(remainingProcessedTransactions)
      : getImportBatchStatusAfterDeletion(
          remainingProcessedTransactions,
          removedActiveTransactions,
        ),
    message: plan.deletedMessage,
    processedRows: Math.max(0, activeImport.processedRows - removedActiveRows),
    processedTransactions: remainingProcessedTransactions,
    totalRows: Math.max(0, activeImport.totalRows - removedActiveRows),
  };
};

export type ImportConfirmationResult =
  | {
      message: string;
      status: 'needs-review' | 'empty';
    }
  | {
      confirmedTransactions: FinanceTransaction[];
      duplicateTransactions: FinanceTransaction[];
      finalMessage: string;
      finalStatus: FinanceStatus;
      stagedForImport: FinanceTransaction[];
      status: 'ready';
    };

export const createImportConfirmation = (
  stagedTransactions: FinanceTransaction[],
  importId: string,
): ImportConfirmationResult => {
  const stagedForImport = stagedTransactions.filter(
    (transaction) => transaction.importId === importId,
  );
  const duplicateTransactions = stagedForImport.filter(isDuplicateTransaction);
  const saveableTransactions = stagedForImport.filter(isSaveableTransaction);
  const allCategorized =
    saveableTransactions.length > 0 &&
    saveableTransactions.every(isTransactionCategorized);

  if (saveableTransactions.length > 0 && !allCategorized) {
    return {
      message: 'Categorize every imported transaction before confirming.',
      status: 'needs-review',
    };
  }

  if (saveableTransactions.length === 0 && duplicateTransactions.length === 0) {
    return {
      message: 'No imported transactions are available to confirm.',
      status: 'empty',
    };
  }

  const confirmedTransactions = saveableTransactions.map((transaction) => ({
    ...transaction,
    status: 'Approved' as const,
  }));
  const finalStatus: FinanceStatus =
    confirmedTransactions.length > 0 ? 'Approved' : 'Duplicate';
  const finalMessage =
    confirmedTransactions.length > 0
      ? `Committed ${confirmedTransactions.length} non-duplicate transaction${
          confirmedTransactions.length === 1 ? '' : 's'
        } to the transaction table.${
          duplicateTransactions.length > 0
            ? ` ${duplicateTransactions.length} duplicate row${
                duplicateTransactions.length === 1 ? '' : 's'
              } skipped.`
            : ''
        }`
      : `Skipped ${duplicateTransactions.length} duplicate row${
          duplicateTransactions.length === 1 ? '' : 's'
        }. No transactions were added.`;

  return {
    confirmedTransactions,
    duplicateTransactions,
    finalMessage,
    finalStatus,
    stagedForImport,
    status: 'ready',
  };
};

const getImportIdTimestamp = (importId: string) => {
  const timestamp = Number(importId.replace(/^import-/, ''));

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getStagedTransactionsByImportId = (
  stagedTransactions: FinanceTransaction[],
) => {
  const transactionsByImportId = new Map<string, FinanceTransaction[]>();

  stagedTransactions.forEach((transaction) => {
    if (!transaction.importId) {
      return;
    }

    transactionsByImportId.set(transaction.importId, [
      ...(transactionsByImportId.get(transaction.importId) ?? []),
      transaction,
    ]);
  });

  return transactionsByImportId;
};

const getImportDateFromId = (importId: string) => {
  const timestamp = getImportIdTimestamp(importId);

  if (timestamp === 0) {
    return 'Restored import';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
};

export const ensureImportsForStagedTransactions = (
  imports: ImportBatch[],
  stagedTransactions: FinanceTransaction[],
) => {
  const existingImportIds = new Set(imports.map((item) => item.id));
  const transactionsByImportId =
    getStagedTransactionsByImportId(stagedTransactions);
  const restoredImports = Array.from(transactionsByImportId.entries())
    .filter(([importId]) => !existingImportIds.has(importId))
    .map(([importId, transactions]) => ({
      id: importId,
      duplicateRows: transactions.filter(isDuplicateTransaction).length,
      fileName: transactions[0]?.sourceFile ?? 'Restored CSV import',
      date: getImportDateFromId(importId),
      rows: transactions.length,
      status: getImportBatchStatus(transactions),
    }));

  return [...restoredImports, ...imports];
};

export const restoreActiveImportFromStaged = (
  imports: ImportBatch[],
  stagedTransactions: FinanceTransaction[],
): ActiveImport => {
  const transactionsByImportId =
    getStagedTransactionsByImportId(stagedTransactions);

  const restorableImport =
    imports.find(
      (item) =>
        item.status !== 'Approved' && transactionsByImportId.has(item.id),
    ) ??
    Array.from(transactionsByImportId.keys())
      .toSorted(
        (left, right) =>
          getImportIdTimestamp(right) - getImportIdTimestamp(left),
      )
      .map((importId) => imports.find((item) => item.id === importId))
      .find((item): item is ImportBatch => Boolean(item));

  if (!restorableImport) {
    return idleActiveImport;
  }

  const processedTransactions =
    transactionsByImportId.get(restorableImport.id) ?? [];

  if (processedTransactions.length === 0) {
    return idleActiveImport;
  }

  return {
    activeImportId: restorableImport.id,
    fileName:
      restorableImport.fileName ??
      processedTransactions[0]?.sourceFile ??
      'Restored CSV import',
    finalBatchStatus: restorableImport.status,
    isComplete: true,
    isProcessing: false,
    message: `Restored ${processedTransactions.length} staged rows from ${restorableImport.fileName}.`,
    processedRows: processedTransactions.length,
    processedTransactions,
    totalRows: restorableImport.rows || processedTransactions.length,
  };
};

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
