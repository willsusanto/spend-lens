import { FinanceTransaction } from './data';

const csvHeaders = [
  'Date',
  'Description',
  'Category',
  'Amount',
  'Direction',
  'Status',
  'Confidence',
  'Category Source',
  'Ollama Model',
  'AI Reason',
  'Note',
  'Source File',
];

const escapeCsvCell = (value: string | number | undefined) => {
  const text = String(value ?? '');

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const serializeTransactionsCsv = (
  transactions: FinanceTransaction[],
) => {
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.description,
    transaction.category,
    transaction.amount,
    transaction.direction,
    transaction.status,
    transaction.confidence,
    transaction.categorizationSource,
    transaction.ollamaModel,
    transaction.aiReason,
    transaction.note,
    transaction.sourceFile,
  ]);

  return [csvHeaders, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
};

export const getTransactionsExportFileName = (date = new Date()) => {
  const stamp = date.toISOString().slice(0, 10);

  return `spendlens-transactions-${stamp}.csv`;
};
