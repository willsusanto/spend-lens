import {
  FinanceTransaction,
  ImportBatch,
  normalizeFinanceStatus,
  seedImports,
  seedTransactions,
} from '@/features/finance/data';
import { normalizeTransactionDirection } from '@/features/finance/duplicate-transactions';

export type FinanceStoreSnapshot = {
  imports: ImportBatch[];
  stagedTransactions: FinanceTransaction[];
  transactions: FinanceTransaction[];
};

export type FinanceStore = {
  load: () => Promise<FinanceStoreSnapshot>;
  saveImports: (imports: ImportBatch[]) => Promise<void>;
  saveStagedTransactions: (transactions: FinanceTransaction[]) => Promise<void>;
  saveTransactions: (transactions: FinanceTransaction[]) => Promise<void>;
};

type StorageKey = {
  current: string;
  legacy: readonly string[];
};

const transactionsKey: StorageKey = {
  current: 'spendlens.transactions',
  legacy: ['ledgerlocal.transactions'],
};
const stagedTransactionsKey: StorageKey = {
  current: 'spendlens.staged-transactions',
  legacy: ['ledgerlocal.staged-transactions'],
};
const importsKey: StorageKey = {
  current: 'spendlens.imports',
  legacy: ['ledgerlocal.imports'],
};

const parseStored = <T>(value: string | null) => {
  if (!value) {
    return undefined;
  }

  try {
    return (JSON.parse(value) as T | null) ?? undefined;
  } catch {
    return undefined;
  }
};

const readStored = <T>(key: StorageKey, fallback: T) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = window.localStorage.getItem(key.current);
  const parsedValue = parseStored<T>(value);

  if (parsedValue !== undefined) {
    return parsedValue;
  }

  for (const legacyKey of key.legacy) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    const parsedLegacyValue = parseStored<T>(legacyValue);

    if (parsedLegacyValue !== undefined && legacyValue) {
      window.localStorage.setItem(key.current, legacyValue);

      return parsedLegacyValue;
    }
  }

  return fallback;
};

type StoredTransaction = FinanceTransaction & {
  merchant?: string;
};

type StoredImportBatch = Omit<ImportBatch, 'status'> & {
  status?: unknown;
};

export const normalizeFinanceTransactions = (
  transactions: StoredTransaction[],
): FinanceTransaction[] =>
  transactions.map(({ merchant, ...transaction }) => ({
    ...transaction,
    description: transaction.description?.trim() || merchant || '',
    direction: normalizeTransactionDirection(
      transaction.direction,
      transaction.amount,
    ),
    status: normalizeFinanceStatus(transaction.status),
  }));

export const normalizeFinanceImports = (
  imports: StoredImportBatch[],
): ImportBatch[] =>
  imports.map((item) => ({
    ...item,
    status: normalizeFinanceStatus(item.status),
  }));

export const normalizeFinanceStoreSnapshot = (
  snapshot: Partial<FinanceStoreSnapshot>,
): FinanceStoreSnapshot => ({
  imports: normalizeFinanceImports(
    Array.isArray(snapshot.imports) ? snapshot.imports : seedImports,
  ),
  stagedTransactions: normalizeFinanceTransactions(
    Array.isArray(snapshot.stagedTransactions)
      ? snapshot.stagedTransactions
      : [],
  ),
  transactions: normalizeFinanceTransactions(
    Array.isArray(snapshot.transactions)
      ? snapshot.transactions
      : seedTransactions,
  ),
});

const writeStored = async <T>(key: StorageKey, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key.current, JSON.stringify(value));
};

export const localStorageFinanceStore: FinanceStore = {
  load: async () => {
    return normalizeFinanceStoreSnapshot({
      imports: normalizeFinanceImports(
        readStored<StoredImportBatch[]>(importsKey, seedImports),
      ),
      stagedTransactions: normalizeFinanceTransactions(
        readStored<StoredTransaction[]>(stagedTransactionsKey, []),
      ),
      transactions: normalizeFinanceTransactions(
        readStored<StoredTransaction[]>(transactionsKey, seedTransactions),
      ),
    });
  },
  saveImports: (imports) => writeStored(importsKey, imports),
  saveStagedTransactions: (transactions) =>
    writeStored(stagedTransactionsKey, transactions),
  saveTransactions: (transactions) =>
    writeStored(transactionsKey, transactions),
};

const financeStoreApiPath = '/api/finance-store';

const parseApiError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: unknown };

    if (typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // Fall back to the status line below.
  }

  return `Finance store request failed with ${response.status}.`;
};

const fetchFinanceStore = async (init: RequestInit = {}): Promise<Response> => {
  const response = await fetch(financeStoreApiPath, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response;
};

const saveFinanceStorePatch = async (patch: Partial<FinanceStoreSnapshot>) => {
  await fetchFinanceStore({
    body: JSON.stringify(patch),
    method: 'PATCH',
  });
};

export const apiFinanceStore: FinanceStore = {
  load: async () => {
    const response = await fetchFinanceStore({
      cache: 'no-store',
      method: 'GET',
    });
    const snapshot = (await response.json()) as Partial<FinanceStoreSnapshot>;

    return normalizeFinanceStoreSnapshot(snapshot);
  },
  saveImports: (imports) => saveFinanceStorePatch({ imports }),
  saveStagedTransactions: (stagedTransactions) =>
    saveFinanceStorePatch({ stagedTransactions }),
  saveTransactions: (transactions) => saveFinanceStorePatch({ transactions }),
};

export const getDefaultFinanceStore = () =>
  process.env.NEXT_PUBLIC_FINANCE_STORE_MODE === 'database'
    ? apiFinanceStore
    : localStorageFinanceStore;
