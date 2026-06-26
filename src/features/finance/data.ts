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

export const seedImports: ImportBatch[] = [
  {
    id: 'seed-import-chase-oct',
    fileName: 'chase_checking_oct.csv',
    date: 'Oct 22, 10:45 AM',
    rows: 142,
    status: 'Pending',
  },
  {
    id: 'seed-import-amex-oct',
    fileName: 'amex_credit_oct.csv',
    date: 'Oct 20, 09:12 AM',
    rows: 89,
    status: 'Pending',
  },
  {
    id: 'seed-import-citi-sep',
    fileName: 'citi_rewards_sep.csv',
    date: 'Oct 05, 14:20 PM',
    rows: 215,
    status: 'Pending',
  },
];

export const seedTransactions: FinanceTransaction[] = [
  {
    id: 'aws-web-services',
    date: 'Oct 24, 2023',
    description: 'Starbucks SBUX STORE #10294',
    amount: -4.8,
    category: 'Eating Out',
    confidence: 95,
    status: 'Pending',
  },
  {
    id: 'unknown-pos',
    date: 'Oct 23, 2023',
    description: 'Unknown POS TERMINAL ID: 8847291',
    amount: -18.5,
    category: 'Uncategorized',
    confidence: 31,
    status: 'Review',
  },
  {
    id: 'amazon-web-services',
    date: 'Oct 22, 2023',
    description: 'Amazon Web Services AWS EMEA SARL',
    amount: -45.12,
    category: 'Subscriptions',
    confidence: 99,
    status: 'Pending',
  },
  {
    id: 'uber-rides',
    date: 'Oct 21, 2023',
    description: 'Uber Rides UBER *TRIP SF',
    amount: -24,
    category: 'Transport',
    confidence: 88,
    status: 'Approved',
  },
  {
    id: 'stripe-payout',
    date: 'Oct 15, 2023',
    description: 'Stripe Payout STRIPE TRANSFER',
    amount: 1240,
    category: 'Income',
    confidence: 100,
    status: 'Pending',
  },
];

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
