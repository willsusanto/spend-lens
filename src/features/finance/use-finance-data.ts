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

    setTransactions((current) => [...parsed.transactions, ...current]);
    setImports((current) => [parsed.batch, ...current]);
    setMessage(
      `Imported ${parsed.transactions.length} transactions from ${file.name}.`,
    );
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
    stats,
    importCsv,
    approveTransaction,
    approveTransactions,
  };
};
