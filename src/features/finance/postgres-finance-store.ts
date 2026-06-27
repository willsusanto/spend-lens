import { Pool, PoolClient } from 'pg';

import { env } from '@/config/env';
import {
  FinanceStore,
  FinanceStoreSnapshot,
  normalizeFinanceImports,
  normalizeFinanceStoreSnapshot,
  normalizeFinanceTransactions,
} from '@/features/finance/finance-store';
import {
  financeImportBatchesTableName,
  financeStateTableName,
  financeStoreSectionsTableName,
  financeTransactionsTableName,
  fromPostgresFinanceTransactionEntity,
  fromPostgresImportBatchEntity,
  legacyFinanceStateTableName,
  PostgresFinanceTransactionEntity,
  PostgresImportBatchEntity,
  toPostgresFinanceTransactionEntity,
  toPostgresImportBatchEntity,
  TransactionStorageState,
} from '@/features/finance/postgres-finance-entities';

type FinanceStoreKey = keyof FinanceStoreSnapshot;

type FinanceStoreRow = {
  key: FinanceStoreKey;
  value: unknown;
};

type FinanceStoreSectionRow = {
  section_key: FinanceStoreKey;
};

const stateKeys = [
  'imports',
  'stagedTransactions',
  'transactions',
] satisfies FinanceStoreKey[];

let pool: Pool | null = null;
let schemaReady = false;

const isLocalDatabaseHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const getSslConfig = (connectionString: string) => {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');

    if (sslMode === 'disable') {
      return false;
    }

    if (sslMode === 'require') {
      return { rejectUnauthorized: false };
    }

    if (
      isLocalDatabaseHost(url.hostname) ||
      url.hostname.endsWith('.internal')
    ) {
      return false;
    }

    if (url.hostname.endsWith('rlwy.net')) {
      return { rejectUnauthorized: false };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const getPool = () => {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when database mode is enabled.');
  }

  pool ??= new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    ssl: getSslConfig(env.DATABASE_URL),
  });

  return pool;
};

const getTableExists = async (tableName: string) => {
  const result = await getPool().query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${tableName}`],
  );

  return result.rows[0]?.exists ?? false;
};

const createNormalizedSchema = async () => {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${financeImportBatchesTableName} (
      id text PRIMARY KEY,
      file_name text NOT NULL,
      date_label text NOT NULL,
      row_count integer NOT NULL DEFAULT 0,
      duplicate_rows integer,
      status text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${financeTransactionsTableName} (
      id text PRIMARY KEY,
      transaction_state text NOT NULL CHECK (
        transaction_state IN ('ledger', 'staged')
      ),
      transaction_date text NOT NULL,
      description text NOT NULL,
      amount numeric(18, 2) NOT NULL,
      category text NOT NULL,
      confidence integer NOT NULL DEFAULT 31,
      status text NOT NULL,
      direction text CHECK (direction IS NULL OR direction IN ('CR', 'DB')),
      note text,
      ai_reason text,
      categorization_source text CHECK (
        categorization_source IS NULL OR
        categorization_source IN ('manual', 'ollama')
      ),
      ollama_model text,
      import_id text,
      source_file text,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${financeStoreSectionsTableName} (
      section_key text PRIMARY KEY,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await getPool().query(`
    CREATE INDEX IF NOT EXISTS spendlens_finance_transactions_state_idx
    ON ${financeTransactionsTableName} (transaction_state, sort_order)
  `);

  await getPool().query(`
    CREATE INDEX IF NOT EXISTS spendlens_finance_transactions_import_idx
    ON ${financeTransactionsTableName} (import_id)
  `);

  await getPool().query(`
    CREATE INDEX IF NOT EXISTS spendlens_import_batches_order_idx
    ON ${financeImportBatchesTableName} (sort_order)
  `);
};

const markSectionSaved = async (
  client: PoolClient,
  sectionKey: FinanceStoreKey,
) => {
  await client.query(
    `
      INSERT INTO ${financeStoreSectionsTableName} (section_key, updated_at)
      VALUES ($1, now())
      ON CONFLICT (section_key)
      DO UPDATE SET updated_at = now()
    `,
    [sectionKey],
  );
};

const replaceImports = async (
  client: PoolClient,
  imports: FinanceStoreSnapshot['imports'],
) => {
  for (const [sortOrder, item] of imports.entries()) {
    const entity = toPostgresImportBatchEntity(item, sortOrder);

    await client.query(
      `
        INSERT INTO ${financeImportBatchesTableName} (
          id,
          file_name,
          date_label,
          row_count,
          duplicate_rows,
          status,
          sort_order,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, now())
        ON CONFLICT (id)
        DO UPDATE SET
          file_name = EXCLUDED.file_name,
          date_label = EXCLUDED.date_label,
          row_count = EXCLUDED.row_count,
          duplicate_rows = EXCLUDED.duplicate_rows,
          status = EXCLUDED.status,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
      `,
      [
        entity.id,
        entity.file_name,
        entity.date_label,
        entity.row_count,
        entity.duplicate_rows,
        entity.status,
        entity.sort_order,
      ],
    );
  }

  await client.query(
    `
      DELETE FROM ${financeImportBatchesTableName} import_batch
      WHERE NOT (import_batch.id = ANY($1::text[]))
      AND NOT EXISTS (
        SELECT 1
        FROM ${financeTransactionsTableName} finance_transaction
        WHERE finance_transaction.import_id = import_batch.id
      )
    `,
    [imports.map((item) => item.id)],
  );

  await markSectionSaved(client, 'imports');
};

const replaceTransactions = async (
  client: PoolClient,
  transactionState: TransactionStorageState,
  transactions: FinanceStoreSnapshot['transactions'],
) => {
  for (const [sortOrder, item] of transactions.entries()) {
    const entity = toPostgresFinanceTransactionEntity(
      item,
      transactionState,
      sortOrder,
    );

    await client.query(
      `
        INSERT INTO ${financeTransactionsTableName} (
          id,
          transaction_state,
          transaction_date,
          description,
          amount,
          category,
          confidence,
          status,
          direction,
          note,
          ai_reason,
          categorization_source,
          ollama_model,
          import_id,
          source_file,
          sort_order,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, now()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          transaction_state = EXCLUDED.transaction_state,
          transaction_date = EXCLUDED.transaction_date,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          category = EXCLUDED.category,
          confidence = EXCLUDED.confidence,
          status = EXCLUDED.status,
          direction = EXCLUDED.direction,
          note = EXCLUDED.note,
          ai_reason = EXCLUDED.ai_reason,
          categorization_source = EXCLUDED.categorization_source,
          ollama_model = EXCLUDED.ollama_model,
          import_id = EXCLUDED.import_id,
          source_file = EXCLUDED.source_file,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
      `,
      [
        entity.id,
        entity.transaction_state,
        entity.transaction_date,
        entity.description,
        entity.amount,
        entity.category,
        entity.confidence,
        entity.status,
        entity.direction,
        entity.note,
        entity.ai_reason,
        entity.categorization_source,
        entity.ollama_model,
        entity.import_id,
        entity.source_file,
        entity.sort_order,
      ],
    );
  }

  await client.query(
    `
      DELETE FROM ${financeTransactionsTableName}
      WHERE transaction_state = $1
      AND NOT (id = ANY($2::text[]))
    `,
    [transactionState, transactions.map((item) => item.id)],
  );

  await markSectionSaved(
    client,
    transactionState === 'ledger' ? 'transactions' : 'stagedTransactions',
  );
};

const loadStateSnapshotFromTable = async (tableName: string) => {
  if (!(await getTableExists(tableName))) {
    return {};
  }

  const result = await getPool().query<FinanceStoreRow>(
    `SELECT key, value FROM ${tableName} WHERE key = ANY($1::text[])`,
    [stateKeys],
  );
  const snapshot: Partial<FinanceStoreSnapshot> = {};

  result.rows.forEach((row) => {
    if (row.key === 'imports' && Array.isArray(row.value)) {
      snapshot.imports = normalizeFinanceImports(row.value);
    }

    if (row.key === 'stagedTransactions' && Array.isArray(row.value)) {
      snapshot.stagedTransactions = normalizeFinanceTransactions(row.value);
    }

    if (row.key === 'transactions' && Array.isArray(row.value)) {
      snapshot.transactions = normalizeFinanceTransactions(row.value);
    }
  });

  return snapshot;
};

const getNormalizedRowCount = async () => {
  const result = await getPool().query<{ count: string }>(`
    SELECT (
      (SELECT count(*) FROM ${financeImportBatchesTableName}) +
      (SELECT count(*) FROM ${financeTransactionsTableName})
    )::text AS count
  `);

  return Number(result.rows[0]?.count ?? 0);
};

const migrateJsonStateTables = async () => {
  if ((await getNormalizedRowCount()) > 0) {
    return;
  }

  const legacySnapshot = await loadStateSnapshotFromTable(
    legacyFinanceStateTableName,
  );
  const currentSnapshot = await loadStateSnapshotFromTable(
    financeStateTableName,
  );
  const snapshot = {
    ...legacySnapshot,
    ...currentSnapshot,
  };
  const hasStateRows = stateKeys.some((key) => key in snapshot);

  if (!hasStateRows) {
    return;
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    if (snapshot.imports) {
      await replaceImports(client, snapshot.imports);
    }

    if (snapshot.stagedTransactions) {
      await replaceTransactions(client, 'staged', snapshot.stagedTransactions);
    }

    if (snapshot.transactions) {
      await replaceTransactions(client, 'ledger', snapshot.transactions);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const ensureSchema = async () => {
  if (schemaReady) {
    return;
  }

  await createNormalizedSchema();
  await migrateJsonStateTables();

  schemaReady = true;
};

const saveWithClient = async (
  action: (client: PoolClient) => Promise<void>,
) => {
  await ensureSchema();

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    await action(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getSavedSections = async () => {
  const result = await getPool().query<FinanceStoreSectionRow>(
    `
      SELECT section_key
      FROM ${financeStoreSectionsTableName}
      WHERE section_key = ANY($1::text[])
    `,
    [stateKeys],
  );

  return new Set(result.rows.map((row) => row.section_key));
};

const loadImports = async () => {
  const result = await getPool().query<PostgresImportBatchEntity>(`
    SELECT
      id,
      file_name,
      date_label,
      duplicate_rows,
      row_count,
      status,
      sort_order
    FROM ${financeImportBatchesTableName}
    ORDER BY sort_order ASC, updated_at DESC, id ASC
  `);

  return result.rows.map(fromPostgresImportBatchEntity);
};

const loadTransactions = async (transactionState: TransactionStorageState) => {
  const result = await getPool().query<PostgresFinanceTransactionEntity>(
    `
      SELECT
        id,
        transaction_state,
        transaction_date,
        description,
        amount,
        category,
        confidence,
        status,
        direction,
        note,
        ai_reason,
        categorization_source,
        ollama_model,
        import_id,
        source_file,
        sort_order
      FROM ${financeTransactionsTableName}
      WHERE transaction_state = $1
      ORDER BY sort_order ASC, updated_at DESC, id ASC
    `,
    [transactionState],
  );

  return result.rows.map(fromPostgresFinanceTransactionEntity);
};

export const postgresFinanceStore: FinanceStore = {
  load: async () => {
    await ensureSchema();

    const savedSections = await getSavedSections();
    const imports = await loadImports();
    const stagedTransactions = await loadTransactions('staged');
    const transactions = await loadTransactions('ledger');

    return normalizeFinanceStoreSnapshot({
      imports:
        savedSections.has('imports') || imports.length > 0
          ? imports
          : undefined,
      stagedTransactions:
        savedSections.has('stagedTransactions') || stagedTransactions.length > 0
          ? stagedTransactions
          : undefined,
      transactions:
        savedSections.has('transactions') || transactions.length > 0
          ? transactions
          : undefined,
    });
  },
  saveImports: (imports) =>
    saveWithClient((client) => replaceImports(client, imports)),
  saveStagedTransactions: (stagedTransactions) =>
    saveWithClient((client) =>
      replaceTransactions(client, 'staged', stagedTransactions),
    ),
  saveTransactions: (transactions) =>
    saveWithClient((client) =>
      replaceTransactions(client, 'ledger', transactions),
    ),
};
