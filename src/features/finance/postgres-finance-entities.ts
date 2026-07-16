import {
  CategorizationSource,
  FinanceTransaction,
  ImportBatch,
  normalizeFinanceStatus,
  TransactionDirection,
} from './data';
import { normalizeTransactionDirection } from './duplicate-transactions';

export const financeImportBatchesTableName = 'spendlens_import_batches';
export const financeStoreSectionsTableName = 'spendlens_finance_store_sections';
export const financeTransactionsTableName = 'spendlens_finance_transactions';
export const financeStateTableName = 'spendlens_finance_state';
export const legacyFinanceStateTableName = 'ledgerlocal_finance_state';

export type TransactionStorageState = 'ledger' | 'staged';

export type PostgresImportBatchEntity = {
  date_label: string;
  duplicate_rows: number | null;
  file_name: string;
  id: string;
  row_count: number;
  sort_order: number;
  status: string;
  user_id: string;
};

export type PostgresFinanceTransactionEntity = {
  ai_reason: string | null;
  amount: number | string;
  categorization_source: string | null;
  category: string;
  confidence: number;
  description: string;
  direction: string | null;
  id: string;
  import_id: string | null;
  note: string | null;
  ollama_model: string | null;
  sort_order: number;
  source_file: string | null;
  status: string;
  transaction_date: string;
  transaction_state: TransactionStorageState;
  user_id: string;
};

const toInteger = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const toAmount = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const toOptionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

const toNullableString = (value: string | undefined) => value ?? null;

const toCategorizationSource = (
  value: unknown,
): CategorizationSource | undefined =>
  value === 'manual' || value === 'ollama' ? value : undefined;

const toTransactionDirection = (
  value: unknown,
  amount: number,
): TransactionDirection =>
  normalizeTransactionDirection(
    value === 'CR' || value === 'DB' ? value : undefined,
    amount,
  );

export const toPostgresImportBatchEntity = (
  batch: ImportBatch,
  sortOrder: number,
  userId: string,
): PostgresImportBatchEntity => ({
  date_label: batch.date,
  duplicate_rows:
    typeof batch.duplicateRows === 'number' ? batch.duplicateRows : null,
  file_name: batch.fileName,
  id: batch.id,
  row_count: batch.rows,
  sort_order: sortOrder,
  status: batch.status,
  user_id: userId,
});

export const fromPostgresImportBatchEntity = (
  entity: PostgresImportBatchEntity,
): ImportBatch => {
  const batch: ImportBatch = {
    date: entity.date_label,
    fileName: entity.file_name,
    id: entity.id,
    rows: toInteger(entity.row_count),
    status: normalizeFinanceStatus(entity.status),
  };

  if (entity.duplicate_rows !== null) {
    batch.duplicateRows = toInteger(entity.duplicate_rows);
  }

  return batch;
};

export const toPostgresFinanceTransactionEntity = (
  transaction: FinanceTransaction,
  transactionState: TransactionStorageState,
  sortOrder: number,
  userId: string,
): PostgresFinanceTransactionEntity => ({
  ai_reason: toNullableString(transaction.aiReason),
  amount: transaction.amount,
  categorization_source: toNullableString(transaction.categorizationSource),
  category: transaction.category,
  confidence: transaction.confidence,
  description: transaction.description,
  direction: transaction.direction ?? null,
  id: transaction.id,
  import_id: transaction.importId ?? null,
  note: transaction.note ?? null,
  ollama_model: transaction.ollamaModel ?? null,
  sort_order: sortOrder,
  source_file: transaction.sourceFile ?? null,
  status: transaction.status,
  transaction_date: transaction.date,
  transaction_state: transactionState,
  user_id: userId,
});

export const fromPostgresFinanceTransactionEntity = (
  entity: PostgresFinanceTransactionEntity,
): FinanceTransaction => {
  const amount = toAmount(entity.amount);

  return {
    aiReason: toOptionalString(entity.ai_reason),
    amount,
    categorizationSource: toCategorizationSource(entity.categorization_source),
    category: entity.category,
    confidence: toInteger(entity.confidence, 31),
    date: entity.transaction_date,
    description: entity.description.trim(),
    direction: toTransactionDirection(entity.direction, amount),
    id: entity.id,
    importId: toOptionalString(entity.import_id),
    note: toOptionalString(entity.note),
    ollamaModel: toOptionalString(entity.ollama_model),
    sourceFile: toOptionalString(entity.source_file),
    status: normalizeFinanceStatus(entity.status),
  };
};
