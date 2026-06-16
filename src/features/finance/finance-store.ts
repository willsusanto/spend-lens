import {
  FinanceTransaction,
  ImportBatch,
  normalizeFinanceStatus,
  seedImports,
  seedTransactions,
} from '@/features/finance/data';

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

const transactionsKey = 'ledgerlocal.transactions';
const stagedTransactionsKey = 'ledgerlocal.staged-transactions';
const importsKey = 'ledgerlocal.imports';
const legacyLearnedRulesKey = 'ledgerlocal.learned-category-rules';

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

type StoredTransaction = FinanceTransaction & {
  merchant?: string;
};

type StoredImportBatch = Omit<ImportBatch, 'status'> & {
  status?: unknown;
};

const normalizeTransactions = (
  transactions: StoredTransaction[],
): FinanceTransaction[] =>
  transactions.map(({ merchant, ...transaction }) => ({
    ...transaction,
    description: transaction.description?.trim() || merchant || '',
    status: normalizeFinanceStatus(transaction.status),
  }));

const normalizeImports = (imports: StoredImportBatch[]): ImportBatch[] =>
  imports.map((item) => ({
    ...item,
    status: normalizeFinanceStatus(item.status),
  }));

const writeStored = async <T>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const localStorageFinanceStore: FinanceStore = {
  load: async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(legacyLearnedRulesKey);
    }

    return {
      imports: normalizeImports(
        readStored<StoredImportBatch[]>(importsKey, seedImports),
      ),
      stagedTransactions: normalizeTransactions(
        readStored<StoredTransaction[]>(stagedTransactionsKey, []),
      ),
      transactions: normalizeTransactions(
        readStored<StoredTransaction[]>(transactionsKey, seedTransactions),
      ),
    };
  },
  saveImports: (imports) => writeStored(importsKey, imports),
  saveStagedTransactions: (transactions) =>
    writeStored(stagedTransactionsKey, transactions),
  saveTransactions: (transactions) =>
    writeStored(transactionsKey, transactions),
};

export const createUnsupportedDbFinanceStore = (): FinanceStore => {
  const fail = async () => {
    throw new Error(
      'Database-backed finance store is not implemented yet. Provide a FinanceStore implementation backed by API routes or a server database.',
    );
  };

  return {
    load: async () => {
      await fail();

      return {
        imports: seedImports,
        stagedTransactions: [],
        transactions: seedTransactions,
      };
    },
    saveImports: fail,
    saveStagedTransactions: fail,
    saveTransactions: fail,
  };
};

export const getDefaultFinanceStore = () => localStorageFinanceStore;
