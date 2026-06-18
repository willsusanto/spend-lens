'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { parseTransactionsCsv } from './csv';
import {
  FinanceStatus,
  FinanceTransaction,
  ImportBatch,
  seedImports,
  seedTransactions,
} from './data';
import {
  isDuplicateTransaction,
  isSaveableTransaction,
  markDuplicateTransactions,
} from './duplicate-transactions';
import { FinanceStore, localStorageFinanceStore } from './finance-store';
import { useFinanceSettings } from './use-finance-settings';

const categorizationTimeoutMs = 1200_000;
const categorizationChunkSize = 1;

type CategorizeResponse = {
  transactions: FinanceTransaction[];
  status: FinanceStatus;
  source: 'ollama' | 'manual-review';
  model?: string;
  error?: string;
};

type ImportCsvResult = {
  batch: ImportBatch;
  transactions: FinanceTransaction[];
};

export type FinanceSyncState = 'idle' | 'pending' | 'saved';

export type FinanceSyncStatus = {
  lastSavedAt: Date | null;
  state: FinanceSyncState;
};

export type ManualTransactionInput = {
  date: string;
  description: string;
  amount: number;
  category: string;
};

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

type FinanceDataContextValue = {
  activeImport: ActiveImport;
  addTransaction: (input: ManualTransactionInput) => void;
  approveTransaction: (id: string) => void;
  approveTransactions: (ids: string[]) => void;
  confirmImport: (importId: string) => void;
  deleteTransactions: (ids: string[]) => void;
  draftStagedTransactionCategories: Record<string, string>;
  draftTransactionCategories: Record<string, string>;
  hydrated: boolean;
  importCsv: (file: File) => Promise<ImportCsvResult | null>;
  imports: ImportBatch[];
  message: string | null;
  saveTransactionDetails: (
    id: string,
    details: { category: string; note: string },
  ) => void;
  stats: {
    income: number;
    needsReview: number;
    spending: number;
  };
  stagedTransactions: FinanceTransaction[];
  stagedImportSyncStatuses: Record<string, FinanceSyncStatus>;
  transactions: FinanceTransaction[];
  transactionsSyncStatus: FinanceSyncStatus;
  updateStagedTransactionCategory: (id: string, category: string) => void;
  updateTransactionCategory: (id: string, category: string) => void;
  updateTransactionsCategory: (ids: string[], category: string) => void;
};

const idleActiveImport: ActiveImport = {
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

const idleSyncStatus: FinanceSyncStatus = {
  lastSavedAt: null,
  state: 'idle',
};

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

const chunkTransactions = (transactions: FinanceTransaction[]) => {
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

const isTransactionCategorized = (transaction: FinanceTransaction) =>
  !isDuplicateTransaction(transaction) &&
  transaction.category !== 'Uncategorized' &&
  transaction.status !== 'Review' &&
  transaction.confidence >= 70;

const getImportBatchStatus = (
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
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

const ensureImportsForStagedTransactions = (
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

const restoreActiveImportFromStaged = (
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

const applyManualCategory = (
  transaction: FinanceTransaction,
  category: string,
  reason: string,
): FinanceTransaction => {
  const needsReview = category === 'Uncategorized';

  return {
    ...transaction,
    category,
    confidence: needsReview ? Math.min(transaction.confidence, 31) : 100,
    status: needsReview ? 'Review' : 'Pending',
    categorizationSource: 'manual',
    aiReason: category === transaction.category ? transaction.aiReason : reason,
  };
};

export const FinanceDataProvider = ({
  children,
  store = localStorageFinanceStore,
}: {
  children: ReactNode;
  store?: FinanceStore;
}) => {
  const { categories, ollamaEndpoint, ollamaModel } = useFinanceSettings();
  const [transactions, setTransactions] =
    useState<FinanceTransaction[]>(seedTransactions);
  const [stagedTransactions, setStagedTransactions] = useState<
    FinanceTransaction[]
  >([]);
  const [imports, setImports] = useState<ImportBatch[]>(seedImports);
  const [message, setMessage] = useState<string | null>(null);
  const [activeImport, setActiveImport] =
    useState<ActiveImport>(idleActiveImport);
  const [draftTransactionCategories, setDraftTransactionCategories] = useState<
    Record<string, string>
  >({});
  const [
    draftStagedTransactionCategories,
    setDraftStagedTransactionCategories,
  ] = useState<Record<string, string>>({});
  const [transactionsSyncStatus, setTransactionsSyncStatus] =
    useState<FinanceSyncStatus>(idleSyncStatus);
  const [stagedImportSyncStatuses, setStagedImportSyncStatuses] = useState<
    Record<string, FinanceSyncStatus>
  >({});
  const [hydrated, setHydrated] = useState(false);
  const isProcessingRef = useRef(false);
  const hasUnsavedDraftChanges =
    Object.keys(draftTransactionCategories).length > 0 ||
    Object.keys(draftStagedTransactionCategories).length > 0;

  useEffect(() => {
    let isActive = true;

    const loadStoredData = async () => {
      try {
        const snapshot = await store.load();

        if (!isActive) {
          return;
        }

        const restoredImports = ensureImportsForStagedTransactions(
          snapshot.imports,
          snapshot.stagedTransactions,
        );

        setTransactions(snapshot.transactions);
        setStagedTransactions(snapshot.stagedTransactions);
        setImports(restoredImports);
        setActiveImport(
          restoreActiveImportFromStaged(
            restoredImports,
            snapshot.stagedTransactions,
          ),
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not load finance data store.',
        );
      } finally {
        if (isActive) {
          setHydrated(true);
        }
      }
    };

    void loadStoredData();

    return () => {
      isActive = false;
    };
  }, [store]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void store.saveTransactions(transactions).catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : 'Could not save transactions.',
      );
    });
  }, [hydrated, store, transactions]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void store
      .saveStagedTransactions(stagedTransactions)
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not save staged transactions.',
        );
      });
  }, [hydrated, stagedTransactions, store]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void store.saveImports(imports).catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : 'Could not save imports.',
      );
    });
  }, [hydrated, imports, store]);

  useEffect(() => {
    if (!activeImport.isProcessing && !hasUnsavedDraftChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeImport.isProcessing, hasUnsavedDraftChanges]);

  useEffect(() => {
    const entries = Object.entries(draftTransactionCategories);

    if (entries.length === 0) {
      setTransactionsSyncStatus((current) =>
        current.state === 'pending'
          ? {
              lastSavedAt: current.lastSavedAt,
              state: 'idle',
            }
          : current,
      );

      return;
    }

    setTransactionsSyncStatus((current) => ({
      lastSavedAt: current.lastSavedAt,
      state: 'pending',
    }));

    const timeout = window.setTimeout(() => {
      const entriesById = new Map(entries);

      setTransactions((current) =>
        current.map((transaction) => {
          const category = entriesById.get(transaction.id);

          return category
            ? applyManualCategory(
                transaction,
                category,
                'Category changed during transaction review.',
              )
            : transaction;
        }),
      );
      setDraftTransactionCategories((current) => {
        const next = { ...current };

        entries.forEach(([id, category]) => {
          if (next[id] === category) {
            delete next[id];
          }
        });

        return next;
      });
      setTransactionsSyncStatus({
        lastSavedAt: new Date(),
        state: 'saved',
      });
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [draftTransactionCategories]);

  useEffect(() => {
    if (transactionsSyncStatus.state !== 'saved') {
      return;
    }

    const timeout = window.setTimeout(
      () =>
        setTransactionsSyncStatus((current) => ({
          lastSavedAt: current.lastSavedAt,
          state: 'idle',
        })),
      1500,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [transactionsSyncStatus.state]);

  useEffect(() => {
    const entries = Object.entries(draftStagedTransactionCategories);

    if (entries.length === 0) {
      setStagedImportSyncStatuses((current) => {
        const next = { ...current };
        let changed = false;

        Object.entries(next).forEach(([id, status]) => {
          if (status.state === 'pending') {
            next[id] = {
              lastSavedAt: status.lastSavedAt,
              state: 'idle',
            };
            changed = true;
          }
        });

        return changed ? next : current;
      });

      return;
    }

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

    setStagedImportSyncStatuses((current) => {
      const next = { ...current };

      affectedImportIds.forEach((id) => {
        next[id] = {
          lastSavedAt: next[id]?.lastSavedAt ?? null,
          state: 'pending',
        };
      });

      return next;
    });

    const timeout = window.setTimeout(() => {
      const entriesById = new Map(entries);
      const now = new Date();

      setStagedTransactions((current) => {
        const updated = current.map((transaction) => {
          const category = entriesById.get(transaction.id);

          return category
            ? applyManualCategory(
                transaction,
                category,
                'Category changed during import staging.',
              )
            : transaction;
        });

        setImports((currentImports) =>
          currentImports.map((item) =>
            affectedImportIds.has(item.id)
              ? {
                  ...item,
                  status: getImportBatchStatus(
                    updated.filter(
                      (transaction) => transaction.importId === item.id,
                    ),
                  ),
                }
              : item,
          ),
        );

        return updated;
      });
      setActiveImport((current) => ({
        ...current,
        processedTransactions: current.processedTransactions.map(
          (transaction) => {
            const category = entriesById.get(transaction.id);

            return category
              ? applyManualCategory(
                  transaction,
                  category,
                  'Category changed during import staging.',
                )
              : transaction;
          },
        ),
      }));
      setDraftStagedTransactionCategories((current) => {
        const next = { ...current };

        entries.forEach(([id, category]) => {
          if (next[id] === category) {
            delete next[id];
          }
        });

        return next;
      });
      setStagedImportSyncStatuses((current) => {
        const next = { ...current };

        affectedImportIds.forEach((id) => {
          next[id] = {
            lastSavedAt: now,
            state: 'saved',
          };
        });

        return next;
      });
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeImport.activeImportId,
    activeImport.processedTransactions,
    draftStagedTransactionCategories,
    stagedTransactions,
  ]);

  useEffect(() => {
    const savedImportIds = Object.entries(stagedImportSyncStatuses)
      .filter(([, status]) => status.state === 'saved')
      .map(([id]) => id);

    if (savedImportIds.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStagedImportSyncStatuses((current) => {
        const next = { ...current };

        savedImportIds.forEach((id) => {
          const status = next[id];

          if (status?.state === 'saved') {
            next[id] = {
              lastSavedAt: status.lastSavedAt,
              state: 'idle',
            };
          }
        });

        return next;
      });
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [stagedImportSyncStatuses]);

  const importCsv = useCallback(
    async (file: File) => {
      if (isProcessingRef.current) {
        const detail =
          'An import is already processing. Wait until it finishes before uploading another CSV.';

        setMessage(detail);
        setActiveImport((current) => ({
          ...current,
          message: detail,
        }));

        return null;
      }

      isProcessingRef.current = true;
      try {
        const text = await file.text();
        const parsed = parseTransactionsCsv(text, file.name);
        const duplicateCheckedTransactions = markDuplicateTransactions(
          parsed.transactions,
          [...transactions, ...stagedTransactions],
        );
        const duplicateTransactions = duplicateCheckedTransactions.filter(
          isDuplicateTransaction,
        );
        const transactionsForCategorization =
          duplicateCheckedTransactions.filter(isSaveableTransaction);
        const startMessage = `Processing ${parsed.transactions.length} rows from ${file.name}.`;

        setMessage(startMessage);
        setActiveImport({
          activeImportId: parsed.batch.id,
          fileName: file.name,
          finalBatchStatus: null,
          isComplete: false,
          isProcessing: true,
          message: startMessage,
          processedRows: 0,
          processedTransactions: [],
          totalRows: parsed.transactions.length,
        });

        const processedTransactionsById = new Map<string, FinanceTransaction>();

        const recordProcessedTransaction = (
          transaction: FinanceTransaction,
        ) => {
          processedTransactionsById.set(transaction.id, transaction);
          setStagedTransactions((current) => [transaction, ...current]);
          setActiveImport((current) => ({
            ...current,
            processedRows: current.processedRows + 1,
            processedTransactions: [
              transaction,
              ...current.processedTransactions,
            ],
          }));
        };

        duplicateTransactions.forEach(recordProcessedTransaction);

        const chunks = chunkTransactions(transactionsForCategorization);
        const categorizedChunks: CategorizeResponse[] = [];

        for (const [index, transactionsChunk] of chunks.entries()) {
          const chunkNumber = index + 1;
          const chunkMessage = `Categorizing rows with Ollama. Chunk ${chunkNumber} of ${chunks.length}.`;

          setMessage(chunkMessage);
          setActiveImport((current) => ({
            ...current,
            message: chunkMessage,
          }));

          const controller = new AbortController();
          const timeout = window.setTimeout(
            () => controller.abort(),
            categorizationTimeoutMs,
          );

          try {
            const response = await fetch('/api/categorize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                settings: {
                  categories,
                  ollamaEndpoint,
                  ollamaModel,
                },
                transactions: transactionsChunk,
              }),
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error(`Categorization failed with ${response.status}.`);
            }

            const result = (await response.json()) as CategorizeResponse;
            categorizedChunks.push(result);
            result.transactions.forEach(recordProcessedTransaction);
          } catch (error) {
            const detail =
              error instanceof DOMException && error.name === 'AbortError'
                ? `Ollama took longer than ${
                    categorizationTimeoutMs / 1000
                  } seconds for chunk ${chunkNumber}.`
                : error instanceof Error
                  ? error.message
                  : 'Unknown error.';

            const fallbackResult: CategorizeResponse = {
              transactions: transactionsChunk.map((transaction) => ({
                ...transaction,
                confidence: Math.min(transaction.confidence, 31),
                status: 'Review',
                aiReason: `AI categorization could not run. ${detail}`,
              })),
              source: 'manual-review',
              status: 'Review',
              error: detail,
            };

            categorizedChunks.push(fallbackResult);
            fallbackResult.transactions.forEach(recordProcessedTransaction);
          } finally {
            window.clearTimeout(timeout);
          }
        }

        const mergedTransactions = duplicateCheckedTransactions.map(
          (transaction) =>
            processedTransactionsById.get(transaction.id) ?? transaction,
        );
        const categorizedStatus = getImportBatchStatus(mergedTransactions);

        const batch = {
          ...parsed.batch,
          duplicateRows: duplicateTransactions.length,
          status: categorizedStatus,
        };

        setImports((current) => [batch, ...current]);
        const duplicateMessage =
          duplicateTransactions.length > 0
            ? ` ${duplicateTransactions.length} duplicate row${
                duplicateTransactions.length === 1 ? '' : 's'
              } skipped.`
            : '';
        const doneMessage = `Imported ${mergedTransactions.length} transactions from ${file.name}. ${categorizedStatus}.${duplicateMessage}`;

        setMessage(doneMessage);
        setActiveImport((current) => ({
          ...current,
          finalBatchStatus: categorizedStatus,
          isComplete: true,
          isProcessing: false,
          message: doneMessage,
        }));

        return {
          batch,
          transactions: mergedTransactions,
        } satisfies ImportCsvResult;
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message
            : 'CSV import failed for an unknown reason.';
        const failedMessage = `Import failed. ${detail}`;

        setMessage(failedMessage);
        setActiveImport((current) => ({
          ...current,
          finalBatchStatus: 'Review',
          isComplete: false,
          isProcessing: false,
          message: failedMessage,
        }));

        return null;
      } finally {
        isProcessingRef.current = false;
      }
    },
    [categories, ollamaEndpoint, ollamaModel, stagedTransactions, transactions],
  );

  const approveTransaction = useCallback((id: string) => {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? { ...transaction, status: 'Approved' }
          : transaction,
      ),
    );
  }, []);

  const approveTransactions = useCallback((ids: string[]) => {
    setTransactions((current) =>
      current.map((transaction) =>
        ids.includes(transaction.id)
          ? { ...transaction, status: 'Approved' }
          : transaction,
      ),
    );
  }, []);

  const deleteTransactions = useCallback((ids: string[]) => {
    const idSet = new Set(ids);

    setTransactions((current) =>
      current.filter((transaction) => !idSet.has(transaction.id)),
    );
    setDraftTransactionCategories((current) => {
      const next = { ...current };

      ids.forEach((id) => {
        delete next[id];
      });

      return next;
    });
    setMessage(
      `Deleted ${ids.length} transaction${ids.length === 1 ? '' : 's'}.`,
    );
  }, []);

  const addTransaction = useCallback((input: ManualTransactionInput) => {
    const now = Date.now();
    const transaction: FinanceTransaction = {
      id: `manual-${now}`,
      date: input.date,
      description: input.description.trim(),
      amount: input.amount,
      category: input.category,
      confidence: 100,
      direction: input.amount < 0 ? 'DB' : 'CR',
      status: 'Approved',
      categorizationSource: 'manual',
    };

    setTransactions((current) => [transaction, ...current]);
    setMessage('Manual transaction saved locally.');
  }, []);

  const updateTransactionCategory = useCallback(
    (id: string, category: string) => {
      setDraftTransactionCategories((current) => {
        const transaction = transactions.find((item) => item.id === id);

        if (!transaction || transaction.category === category) {
          const next = { ...current };

          delete next[id];

          return next;
        }

        return {
          ...current,
          [id]: category,
        };
      });
    },
    [transactions],
  );

  const updateStagedTransactionCategory = useCallback(
    (id: string, category: string) => {
      setDraftStagedTransactionCategories((current) => {
        const transaction =
          stagedTransactions.find((item) => item.id === id) ??
          activeImport.processedTransactions.find((item) => item.id === id);

        if (!transaction || transaction.category === category) {
          const next = { ...current };

          delete next[id];

          return next;
        }

        return {
          ...current,
          [id]: category,
        };
      });
    },
    [activeImport.processedTransactions, stagedTransactions],
  );

  const updateTransactionsCategory = useCallback(
    (ids: string[], category: string) => {
      setTransactions((current) =>
        current.map((transaction) => {
          if (!ids.includes(transaction.id)) {
            return transaction;
          }

          return applyManualCategory(
            transaction,
            category,
            'Category changed during bulk transaction review.',
          );
        }),
      );
      setDraftTransactionCategories((current) => {
        const next = { ...current };

        ids.forEach((id) => {
          delete next[id];
        });

        return next;
      });
      setMessage(`Updated ${ids.length} transaction categories locally.`);
    },
    [],
  );

  const saveTransactionDetails = useCallback(
    (id: string, details: { category: string; note: string }) => {
      setTransactions((current) =>
        current.map((transaction) => {
          if (transaction.id !== id) {
            return transaction;
          }

          const categoryChanged = details.category !== transaction.category;
          const needsReview = details.category === 'Uncategorized';

          return {
            ...transaction,
            category: details.category,
            note: details.note,
            confidence: categoryChanged
              ? needsReview
                ? Math.min(transaction.confidence, 31)
                : 100
              : transaction.confidence,
            status: needsReview ? 'Review' : transaction.status,
            categorizationSource: categoryChanged
              ? 'manual'
              : transaction.categorizationSource,
            aiReason: categoryChanged
              ? 'Category changed during transaction review.'
              : transaction.aiReason,
          };
        }),
      );
      setMessage('Transaction details saved locally.');
    },
    [],
  );

  const confirmImport = useCallback(
    (importId: string) => {
      const stagedForImport = stagedTransactions.filter(
        (transaction) => transaction.importId === importId,
      );
      const duplicateTransactions = stagedForImport.filter(
        isDuplicateTransaction,
      );
      const saveableTransactions = stagedForImport.filter(
        isSaveableTransaction,
      );
      const allCategorized =
        saveableTransactions.length > 0 &&
        saveableTransactions.every(isTransactionCategorized);

      if (saveableTransactions.length > 0 && !allCategorized) {
        setMessage('Categorize every imported transaction before confirming.');

        return;
      }

      if (
        saveableTransactions.length === 0 &&
        duplicateTransactions.length === 0
      ) {
        setMessage('No imported transactions are available to confirm.');

        return;
      }

      const confirmedTransactions = saveableTransactions.map((transaction) => ({
        ...transaction,
        status: 'Approved' as const,
      }));
      const finalStatus: FinanceStatus =
        confirmedTransactions.length > 0 ? 'Approved' : 'Duplicate';
      const finalMessage =
        confirmedTransactions.length > 0
          ? `Import confirmed and categories saved locally.${
              duplicateTransactions.length > 0
                ? ` ${duplicateTransactions.length} duplicate row${
                    duplicateTransactions.length === 1 ? '' : 's'
                  } skipped.`
                : ''
            }`
          : `Skipped ${duplicateTransactions.length} duplicate row${
              duplicateTransactions.length === 1 ? '' : 's'
            }. No transactions were added.`;

      if (confirmedTransactions.length > 0) {
        setTransactions((current) => [...confirmedTransactions, ...current]);
      }
      setStagedTransactions((current) =>
        current.filter((transaction) => transaction.importId !== importId),
      );
      setDraftStagedTransactionCategories((current) => {
        const next = { ...current };

        stagedForImport.forEach((transaction) => {
          delete next[transaction.id];
        });

        return next;
      });
      setStagedImportSyncStatuses((current) => {
        const next = { ...current };

        delete next[importId];

        return next;
      });
      setImports((current) =>
        current.map((item) =>
          item.id === importId
            ? {
                ...item,
                duplicateRows: duplicateTransactions.length,
                status: finalStatus,
              }
            : item,
        ),
      );
      setActiveImport((current) =>
        current.activeImportId === importId
          ? {
              ...current,
              finalBatchStatus: finalStatus,
              message: finalMessage,
            }
          : current,
      );
      setMessage(finalMessage);
    },
    [stagedTransactions],
  );

  const stats = useMemo(() => {
    const spending = transactions
      .filter((transaction) => transaction.amount < 0)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const income = transactions
      .filter((transaction) => transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const needsReview = transactions.filter(
      (transaction) => transaction.status === 'Review',
    ).length;

    return { spending, income, needsReview };
  }, [transactions]);

  const value = useMemo(
    () => ({
      activeImport,
      addTransaction,
      approveTransaction,
      approveTransactions,
      confirmImport,
      deleteTransactions,
      draftStagedTransactionCategories,
      draftTransactionCategories,
      hydrated,
      importCsv,
      imports,
      message,
      saveTransactionDetails,
      stats,
      stagedTransactions,
      stagedImportSyncStatuses,
      transactions,
      transactionsSyncStatus,
      updateStagedTransactionCategory,
      updateTransactionCategory,
      updateTransactionsCategory,
    }),
    [
      activeImport,
      addTransaction,
      approveTransaction,
      approveTransactions,
      confirmImport,
      deleteTransactions,
      draftStagedTransactionCategories,
      draftTransactionCategories,
      hydrated,
      importCsv,
      imports,
      message,
      saveTransactionDetails,
      stats,
      stagedTransactions,
      stagedImportSyncStatuses,
      transactions,
      transactionsSyncStatus,
      updateStagedTransactionCategory,
      updateTransactionCategory,
      updateTransactionsCategory,
    ],
  );

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
};

export const useFinanceData = () => {
  const context = useContext(FinanceDataContext);

  if (!context) {
    throw new Error('useFinanceData must be used within FinanceDataProvider.');
  }

  return context;
};
