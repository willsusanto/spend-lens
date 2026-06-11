'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { parseTransactionsCsv } from './csv';
import {
  FinanceTransaction,
  ImportBatch,
  seedImports,
  seedTransactions,
} from './data';

const transactionsKey = 'ledgerlocal.transactions';
const importsKey = 'ledgerlocal.imports';
const learnedRulesKey = 'ledgerlocal.learned-category-rules';
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

type LearnedCategoryRule = {
  signature: string;
  tokens: string[];
  category: string;
  confidence: number;
  example: string;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
};

const learningStopWords = new Set([
  'banking',
  'cabang',
  'debit',
  'ebanking',
  'ftscy',
  'jumlah',
  'kredit',
  'qris',
  'saldo',
  'tanggal',
  'tgl',
  'transaksi',
  'trsf',
]);

const readStored = <T>(key: string, fallback: T) => {
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

const normalizeLearningText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b[a-z]*\d+[a-z0-9]*\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getLearningTokens = (transaction: FinanceTransaction) => {
  const tokens = normalizeLearningText(
    `${transaction.merchant} ${transaction.description}`,
  )
    .split(' ')
    .filter((token) => token.length > 2 && !learningStopWords.has(token));

  return Array.from(new Set(tokens)).slice(0, 12);
};

const upsertLearnedRule = (
  rules: LearnedCategoryRule[],
  transaction: FinanceTransaction,
  category: string,
) => {
  const tokens = getLearningTokens(transaction);

  if (tokens.length === 0) {
    return rules;
  }

  const signature = tokens.join(' ');
  const existing = rules.find((rule) => rule.signature === signature);
  const now = new Date().toISOString();
  const nextRule: LearnedCategoryRule = {
    signature,
    tokens,
    category,
    confidence: category === 'Uncategorized' ? 31 : 100,
    example: transaction.merchant,
    matchCount: (existing?.matchCount ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  return [
    nextRule,
    ...rules.filter((rule) => rule.signature !== signature),
  ].slice(0, 300);
};

const findLearnedRule = (
  transaction: FinanceTransaction,
  rules: LearnedCategoryRule[],
) => {
  const tokens = getLearningTokens(transaction);
  const signature = tokens.join(' ');
  const tokenSet = new Set(tokens);

  return (
    rules.find((rule) => rule.signature === signature) ??
    rules.find(
      (rule) =>
        rule.tokens.length > 0 &&
        rule.tokens.every((token) => tokenSet.has(token)),
    )
  );
};

const applyLearnedRule = (
  transaction: FinanceTransaction,
  rule: LearnedCategoryRule,
): FinanceTransaction => {
  const needsReview = rule.category === 'Uncategorized';

  return {
    ...transaction,
    category: rule.category,
    confidence: needsReview ? 31 : rule.confidence,
    status: needsReview ? 'Review' : 'Pending',
    aiReason: `Learned from your previous correction for "${rule.example}".`,
    categorizationSource: 'heuristic',
  };
};

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

export const useFinanceData = () => {
  const [transactions, setTransactions] =
    useState<FinanceTransaction[]>(seedTransactions);
  const [imports, setImports] = useState<ImportBatch[]>(seedImports);
  const [learnedRules, setLearnedRules] = useState<LearnedCategoryRule[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTransactions(readStored(transactionsKey, seedTransactions));
    setImports(readStored(importsKey, seedImports));
    setLearnedRules(readStored(learnedRulesKey, []));
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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(learnedRulesKey, JSON.stringify(learnedRules));
  }, [hydrated, learnedRules]);

  const learnTransactionCategory = useCallback(
    (transaction: FinanceTransaction, category: string) => {
      if (transaction.category === category) {
        return;
      }

      setLearnedRules((current) =>
        upsertLearnedRule(current, transaction, category),
      );
    },
    [],
  );

  const importCsv = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed = parseTransactionsCsv(text, file.name);
      setMessage(
        `Categorizing ${parsed.transactions.length} rows with Ollama. You will be redirected automatically when it finishes.`,
      );

      const learnedTransactionsById = new Map<string, FinanceTransaction>();
      const transactionsForCategorization: FinanceTransaction[] = [];

      parsed.transactions.forEach((transaction) => {
        const learnedRule = findLearnedRule(transaction, learnedRules);

        if (learnedRule) {
          learnedTransactionsById.set(
            transaction.id,
            applyLearnedRule(transaction, learnedRule),
          );
          return;
        }

        transactionsForCategorization.push(transaction);
      });

      if (learnedTransactionsById.size > 0) {
        setMessage(
          `${learnedTransactionsById.size} rows matched learned corrections. Categorizing ${transactionsForCategorization.length} new rows with Ollama.`,
        );
      }

      const chunks = chunkTransactions(transactionsForCategorization);
      const categorizedChunks: CategorizeResponse[] = [];

      for (const [index, transactionsChunk] of chunks.entries()) {
        const chunkNumber = index + 1;

        setMessage(
          `Categorizing rows with Ollama. Chunk ${chunkNumber} of ${chunks.length}.`,
        );

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

          categorizedChunks.push((await response.json()) as CategorizeResponse);
        } catch (error) {
          const detail =
            error instanceof DOMException && error.name === 'AbortError'
              ? `Ollama took longer than ${
                  categorizationTimeoutMs / 1000
                } seconds for chunk ${chunkNumber}.`
              : error instanceof Error
                ? error.message
                : 'Unknown error.';

          categorizedChunks.push({
            transactions: transactionsChunk.map((transaction) => ({
              ...transaction,
              aiReason: `Ollama categorization could not run. ${detail}`,
              categorizationSource: 'heuristic',
            })),
            source: 'heuristic',
            status: 'Heuristic fallback',
            error: detail,
          });
        } finally {
          window.clearTimeout(timeout);
        }
      }

      const categorizedTransactions = categorizedChunks.flatMap(
        (chunk) => chunk.transactions,
      );
      const categorizedTransactionsById = new Map(
        categorizedTransactions.map((transaction) => [
          transaction.id,
          transaction,
        ]),
      );
      const mergedTransactions = parsed.transactions.map(
        (transaction) =>
          learnedTransactionsById.get(transaction.id) ??
          categorizedTransactionsById.get(transaction.id) ??
          transaction,
      );
      const ollamaChunkCount = categorizedChunks.filter(
        (chunk) => chunk.source === 'ollama',
      ).length;
      const learnedCount = learnedTransactionsById.size;
      const allOllamaChunksSucceeded =
        chunks.length > 0 && ollamaChunkCount === chunks.length;
      const categorizedStatus =
        learnedCount === parsed.transactions.length
          ? 'Learned categories'
          : allOllamaChunksSucceeded
            ? learnedCount > 0
              ? 'Learned and AI categorized'
              : 'AI categorized'
            : ollamaChunkCount > 0 || learnedCount > 0
              ? 'Partially categorized'
              : 'Heuristic fallback';

      const batch = {
        ...parsed.batch,
        status: categorizedStatus,
      };

      setTransactions((current) => [...mergedTransactions, ...current]);
      setImports((current) => [batch, ...current]);
      setMessage(
        `Imported ${mergedTransactions.length} transactions from ${file.name}. ${categorizedStatus}.`,
      );

      return {
        batch,
        transactions: mergedTransactions,
      } satisfies ImportCsvResult;
    },
    [learnedRules],
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

  const updateTransactionCategory = useCallback(
    (id: string, category: string) => {
      const transaction = transactions.find((item) => item.id === id);

      if (transaction) {
        learnTransactionCategory(transaction, category);
      }

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
    [learnTransactionCategory, transactions],
  );

  const updateTransactionsCategory = useCallback(
    (ids: string[], category: string) => {
      transactions
        .filter((transaction) => ids.includes(transaction.id))
        .forEach((transaction) =>
          learnTransactionCategory(transaction, category),
        );

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
    [learnTransactionCategory, transactions],
  );

  const saveTransactionDetails = useCallback(
    (id: string, details: { category: string; note: string }) => {
      const transaction = transactions.find((item) => item.id === id);

      if (transaction) {
        learnTransactionCategory(transaction, details.category);
      }

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
    [learnTransactionCategory, transactions],
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
