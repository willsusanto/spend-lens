export type FinanceStatus = 'Pending' | 'Review' | 'Approved' | 'Duplicate';
export type TransactionStatus = FinanceStatus;
export type CategorizationSource = 'ollama' | 'manual';
export type TransactionDirection = 'CR' | 'DB';

export type FinanceTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  confidence: number;
  status: TransactionStatus;
  direction?: TransactionDirection;
  note?: string;
  aiReason?: string;
  categorizationSource?: CategorizationSource;
  ollamaModel?: string;
  importId?: string;
  sourceFile?: string;
};

export type ImportBatch = {
  id: string;
  fileName: string;
  date: string;
  duplicateRows?: number;
  rows: number;
  status: FinanceStatus;
};

export const normalizeFinanceStatus = (status: unknown): FinanceStatus => {
  if (status === 'Duplicate') {
    return 'Duplicate';
  }

  if (status === 'Approved' || status === 'Confirmed' || status === 'Cleared') {
    return 'Approved';
  }

  if (
    status === 'Review' ||
    status === 'Needs manual review' ||
    status === 'Failed' ||
    status === 'Partially categorized'
  ) {
    return 'Review';
  }

  return 'Pending';
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

export const formatSignedCurrency = (amount: number) => {
  if (amount > 0) {
    return `+ ${formatCurrency(amount)}`;
  }

  if (amount < 0) {
    return `- ${formatCurrency(amount)}`;
  }

  return formatCurrency(amount);
};

export const categories = [
  'Income',
  'Bills / Utilities',
  'Transport',
  'Groceries',
  'Eating Out',
  'Shopping',
  'Entertainment',
  'Subscriptions',
  'Savings / Investment',
  'Donations',
  'Misc',
  'Uncategorized',
];

export const pageSizeOptions = [3, 5, 10, 30, 60];
