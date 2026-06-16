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
  FinanceTransaction,
  ImportBatch,
  seedImports,
  seedTransactions,
} from './data';
import { FinanceStore, localStorageFinanceStore } from './finance-store';

const categorizationTimeoutMs = 1200_000;
const categorizationChunkSize = 1;

type CategorizeResponse = {
  transactions: FinanceTransaction[];
  status: string;
  source: 'ollama' | 'heuristic';
  model?: string;
  error?: string;
};

type ImportCsvResult = {
  batch: ImportBatch;
  transactions: FinanceTransaction[];
};

export type ManualTransactionInput = {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  description?: string;
};

export type ActiveImport = {
  activeImportId: string | null;
  fileName: string | null;
  finalBatchStatus: string | null;
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
  transactions: FinanceTransaction[];
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

export const FinanceDataProvider = ({
  children,
  store = localStorageFinanceStore,
}: {
  children: ReactNode;
  store?: FinanceStore;
}) => {
  const [transactions, setTransactions] =
    useState<FinanceTransaction[]>(seedTransactions);
  const [imports, setImports] = useState<ImportBatch[]>(seedImports);
  const [message, setMessage] = useState<string | null>(null);
  const [activeImport, setActiveImport] =
    useState<ActiveImport>(idleActiveImport);
  const [hydrated, setHydrated] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const loadStoredData = async () => {
      try {
        const snapshot = await store.load();

        if (!isActive) {
          return;
        }

        setTransactions(snapshot.transactions);
        setImports(snapshot.imports);
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

    void store.saveImports(imports).catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : 'Could not save imports.',
      );
    });
  }, [hydrated, imports, store]);

  const importCsv = useCallback(async (file: File) => {
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

      const recordProcessedTransaction = (transaction: FinanceTransaction) => {
        processedTransactionsById.set(transaction.id, transaction);
        setTransactions((current) => [transaction, ...current]);
        setActiveImport((current) => ({
          ...current,
          processedRows: current.processedRows + 1,
          processedTransactions: [
            transaction,
            ...current.processedTransactions,
          ],
        }));
      };

      const chunks = chunkTransactions(parsed.transactions);
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
            body: JSON.stringify({ transactions: transactionsChunk }),
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
              aiReason: `Ollama categorization could not run. ${detail}`,
              categorizationSource: 'heuristic',
            })),
            source: 'heuristic',
            status: 'Heuristic fallback',
            error: detail,
          };

          categorizedChunks.push(fallbackResult);
          fallbackResult.transactions.forEach(recordProcessedTransaction);
        } finally {
          window.clearTimeout(timeout);
        }
      }

      const mergedTransactions = parsed.transactions.map(
        (transaction) =>
          processedTransactionsById.get(transaction.id) ?? transaction,
      );
      const ollamaChunkCount = categorizedChunks.filter(
        (chunk) => chunk.source === 'ollama',
      ).length;
      const allOllamaChunksSucceeded =
        chunks.length > 0 && ollamaChunkCount === chunks.length;
      const categorizedStatus =
        allOllamaChunksSucceeded && parsed.transactions.length > 0
          ? 'AI categorized'
          : ollamaChunkCount > 0
            ? 'Partially categorized'
            : 'Heuristic fallback';

      const batch = {
        ...parsed.batch,
        status: categorizedStatus,
      };

      setImports((current) => [batch, ...current]);
      const doneMessage = `Imported ${mergedTransactions.length} transactions from ${file.name}. ${categorizedStatus}.`;

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
        finalBatchStatus: 'Failed',
        isComplete: false,
        isProcessing: false,
        message: failedMessage,
      }));

      return null;
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

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

  const addTransaction = useCallback((input: ManualTransactionInput) => {
    const now = Date.now();
    const transaction: FinanceTransaction = {
      id: `manual-${now}`,
      date: input.date,
      merchant: input.merchant,
      description: input.description?.trim() || 'Manual entry',
      amount: input.amount,
      category: input.category,
      confidence: 100,
      status: 'Approved',
      categorizationSource: 'heuristic',
    };

    setTransactions((current) => [transaction, ...current]);
    setMessage('Manual transaction saved locally.');
  }, []);

  const updateTransactionCategory = useCallback(
    (id: string, category: string) => {
      setTransactions((current) =>
        current.map((transaction) => {
          if (transaction.id !== id) {
            return transaction;
          }

          const needsReview = category === 'Uncategorized';

          return {
            ...transaction,
            category,
            confidence: needsReview
              ? Math.min(transaction.confidence, 31)
              : Math.max(transaction.confidence, 100),
            status: needsReview ? 'Review' : 'Pending',
            aiReason:
              category === transaction.category
                ? transaction.aiReason
                : 'Category changed during import review.',
          };
        }),
      );
    },
    [],
  );

  const updateTransactionsCategory = useCallback(
    (ids: string[], category: string) => {
      setTransactions((current) =>
        current.map((transaction) => {
          if (!ids.includes(transaction.id)) {
            return transaction;
          }

          const needsReview = category === 'Uncategorized';

          return {
            ...transaction,
            category,
            confidence: needsReview
              ? Math.min(transaction.confidence, 31)
              : 100,
            status: needsReview ? 'Review' : 'Pending',
            aiReason: 'Category changed during bulk transaction review.',
          };
        }),
      );
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

  const confirmImport = useCallback((importId: string) => {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.importId === importId
          ? { ...transaction, status: 'Approved' }
          : transaction,
      ),
    );
    setImports((current) =>
      current.map((item) =>
        item.id === importId ? { ...item, status: 'Confirmed' } : item,
      ),
    );
    setActiveImport((current) =>
      current.activeImportId === importId
        ? {
            ...current,
            finalBatchStatus: 'Confirmed',
            message: 'Import confirmed and categories saved locally.',
          }
        : current,
    );
    setMessage('Import confirmed and categories saved locally.');
  }, []);

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
      hydrated,
      importCsv,
      imports,
      message,
      saveTransactionDetails,
      stats,
      transactions,
      updateTransactionCategory,
      updateTransactionsCategory,
    }),
    [
      activeImport,
      addTransaction,
      approveTransaction,
      approveTransactions,
      confirmImport,
      hydrated,
      importCsv,
      imports,
      message,
      saveTransactionDetails,
      stats,
      transactions,
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
