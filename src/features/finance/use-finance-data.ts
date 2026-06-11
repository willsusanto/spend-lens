'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  FinanceTransaction,
  ImportBatch,
  seedImports,
  seedTransactions,
} from './data';
import { parseTransactionsCsv } from './csv';

const transactionsKey = 'ledgerlocal.transactions';
const importsKey = 'ledgerlocal.imports';
const categorizationTimeoutMs = 45_000;

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

const readStored = <T,>(key: string, fallback: T) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = window.localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const useFinanceData = () => {
  const [transactions, setTransactions] =
    useState<FinanceTransaction[]>(seedTransactions);
  const [imports, setImports] = useState<ImportBatch[]>(seedImports);
  const [message, setMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTransactions(readStored(transactionsKey, seedTransactions));
    setImports(readStored(importsKey, seedImports));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(transactionsKey, JSON.stringify(transactions));
  }, [hydrated, transactions]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(importsKey, JSON.stringify(imports));
  }, [hydrated, imports]);

  const importCsv = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseTransactionsCsv(text, file.name);
    setMessage(
      `Categorizing ${parsed.transactions.length} rows with Ollama. You will be redirected automatically when it finishes.`,
    );

    let categorized: CategorizeResponse;
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
        body: JSON.stringify({ transactions: parsed.transactions }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Categorization failed with ${response.status}.`);
      }

      categorized = (await response.json()) as CategorizeResponse;
    } catch (error) {
      const detail =
        error instanceof DOMException && error.name === 'AbortError'
          ? `Ollama took longer than ${categorizationTimeoutMs / 1000} seconds.`
          : error instanceof Error
            ? error.message
            : 'Unknown error.';

      categorized = {
        transactions: parsed.transactions.map((transaction) => ({
          ...transaction,
          aiReason: `Ollama categorization could not run. ${detail}`,
          categorizationSource: 'heuristic',
        })),
        source: 'heuristic',
        status: 'Heuristic fallback',
        error: detail,
      };
    } finally {
      window.clearTimeout(timeout);
    }

    const batch = {
      ...parsed.batch,
      status: categorized.status,
    };

    setTransactions((current) => [...categorized.transactions, ...current]);
    setImports((current) => [batch, ...current]);
    setMessage(
      `Imported ${categorized.transactions.length} transactions from ${file.name}. ${categorized.status}.`,
    );

    return {
      batch,
      transactions: categorized.transactions,
    } satisfies ImportCsvResult;
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
            confidence: needsReview ? Math.min(transaction.confidence, 31) : 100,
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

  return {
    transactions,
    imports,
    message,
    hydrated,
    stats,
    importCsv,
    approveTransaction,
    approveTransactions,
    updateTransactionCategory,
    updateTransactionsCategory,
    saveTransactionDetails,
    confirmImport,
  };
};
