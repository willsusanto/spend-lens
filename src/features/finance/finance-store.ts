import {
  FinanceTransaction,
  ImportBatch,
  seedImports,
  seedTransactions,
} from '@/features/finance/data';

export type FinanceStoreSnapshot = {
  imports: ImportBatch[];
  transactions: FinanceTransaction[];
};

export type FinanceStore = {
  load: () => Promise<FinanceStoreSnapshot>;
  saveImports: (imports: ImportBatch[]) => Promise<void>;
  saveTransactions: (transactions: FinanceTransaction[]) => Promise<void>;
};

const transactionsKey = 'ledgerlocal.transactions';
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
      imports: readStored(importsKey, seedImports),
      transactions: readStored(transactionsKey, seedTransactions),
    };
  },
  saveImports: (imports) => writeStored(importsKey, imports),
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
        transactions: seedTransactions,
      };
    },
    saveImports: fail,
    saveTransactions: fail,
  };
};

export const getDefaultFinanceStore = () => localStorageFinanceStore;
