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

import { categories as defaultCategories } from './data';
import { createDefaultCategoryColors } from './finance-settings';

type FinanceStoreKey = keyof FinanceStoreSnapshot;

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

const hasUserIdColumn = async (tableName: string) => {
  if (!(await getTableExists(tableName))) {
    return true;
  }

  const result = await getPool().query<{ count: string }>(
    `
      SELECT count(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = 'user_id'
    `,
    [tableName],
  );

  return Number(result.rows[0]?.count ?? 0) > 0;
};

const createNormalizedSchema = async (userId: string) => {
  // Wipe legacy tables if they don't support RLS (missing user_id column)
  const isImportBatchesRLS = await hasUserIdColumn(
    financeImportBatchesTableName,
  );
  const isTransactionsRLS = await hasUserIdColumn(financeTransactionsTableName);

  let isCategoryPkComposite = true;
  if (await getTableExists('spendlens_categories')) {
    const categoryPkResult = await getPool().query<{ count: string }>(
      `
        SELECT count(*)::text AS count
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'spendlens_categories'
        AND tc.constraint_type = 'PRIMARY KEY'
      `,
    );
    isCategoryPkComposite = Number(categoryPkResult.rows[0]?.count ?? 0) > 1;
  }

  if (!isImportBatchesRLS || !isTransactionsRLS || !isCategoryPkComposite) {
    console.log(
      '[postgres-store] Old schema or non-composite categories table detected. Dropping tables for clean migration.',
    );
    await getPool().query(
      `DROP TABLE IF EXISTS ${financeTransactionsTableName} CASCADE`,
    );
    await getPool().query(`DROP TABLE IF EXISTS spendlens_categories CASCADE`);
    await getPool().query(
      `DROP TABLE IF EXISTS ${financeImportBatchesTableName} CASCADE`,
    );
    await getPool().query(
      `DROP TABLE IF EXISTS ${financeStoreSectionsTableName} CASCADE`,
    );
  }

  // 1. Create categories table
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS spendlens_categories (
      name text,
      color varchar(7) NOT NULL DEFAULT '#71717a',
      type text NOT NULL CHECK (type IN ('Income', 'Expense')),
      user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (name, user_id)
    )
  `);

  // 2. Seed default categories if empty
  const categoriesCountResult = await getPool().query<{ count: string }>(
    'SELECT count(*)::text AS count FROM spendlens_categories WHERE user_id = $1::uuid',
    [userId],
  );
  if (Number(categoriesCountResult.rows[0]?.count ?? 0) === 0) {
    console.log('[postgres-store] Seeding default categories into database.');
    const colors = createDefaultCategoryColors(defaultCategories);
    for (const category of defaultCategories) {
      const color = colors[category] ?? '#71717a';
      const type = category === 'Income' ? 'Income' : 'Expense';
      await getPool().query(
        `
          INSERT INTO spendlens_categories (name, color, type, user_id)
          VALUES ($1, $2, $3, $4::uuid)
          ON CONFLICT (name, user_id) DO NOTHING
        `,
        [category, color, type, userId],
      );
    }
  }

  // 3. Create import batches table
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${financeImportBatchesTableName} (
      id text PRIMARY KEY,
      file_name text NOT NULL,
      date_label text NOT NULL,
      row_count integer NOT NULL DEFAULT 0,
      duplicate_rows integer,
      status text NOT NULL CHECK (status IN ('Pending', 'Review', 'Approved', 'Duplicate')),
      sort_order integer NOT NULL DEFAULT 0,
      user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // 4. Create transactions table
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
      status text NOT NULL CHECK (status IN ('Pending', 'Review', 'Approved', 'Duplicate')),
      direction text CHECK (direction IS NULL OR direction IN ('CR', 'DB')),
      note text,
      ai_reason text,
      categorization_source text CHECK (
        categorization_source IS NULL OR
        categorization_source IN ('manual', 'ollama')
      ),
      ollama_model text,
      import_id text REFERENCES ${financeImportBatchesTableName}(id) ON DELETE CASCADE,
      source_file text,
      sort_order integer NOT NULL DEFAULT 0,
      user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY (category, user_id) REFERENCES spendlens_categories(name, user_id) ON UPDATE CASCADE
    )
  `);

  // 5. Create store sections table
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${financeStoreSectionsTableName} (
      section_key text,
      user_id uuid NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (section_key, user_id)
    )
  `);

  // 6. Create user settings table
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS spendlens_user_settings (
      user_id uuid PRIMARY KEY,
      settings jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Indexes
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
  userId: string,
) => {
  await client.query(
    `
      INSERT INTO ${financeStoreSectionsTableName} (section_key, user_id, updated_at)
      VALUES ($1, $2::uuid, now())
      ON CONFLICT (section_key, user_id)
      DO UPDATE SET updated_at = now()
    `,
    [sectionKey, userId],
  );
};

const replaceImports = async (
  client: PoolClient,
  imports: FinanceStoreSnapshot['imports'],
  userId: string,
) => {
  for (const [sortOrder, item] of imports.entries()) {
    const entity = toPostgresImportBatchEntity(item, sortOrder, userId);

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
          user_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid, now())
        ON CONFLICT (id)
        DO UPDATE SET
          file_name = EXCLUDED.file_name,
          date_label = EXCLUDED.date_label,
          row_count = EXCLUDED.row_count,
          duplicate_rows = EXCLUDED.duplicate_rows,
          status = EXCLUDED.status,
          sort_order = EXCLUDED.sort_order,
          user_id = EXCLUDED.user_id,
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
        entity.user_id,
      ],
    );
  }

  await client.query(
    `
      DELETE FROM ${financeImportBatchesTableName} import_batch
      WHERE import_batch.user_id = $1::uuid
      AND NOT (import_batch.id = ANY($2::text[]))
      AND NOT EXISTS (
        SELECT 1
        FROM ${financeTransactionsTableName} finance_transaction
        WHERE finance_transaction.import_id = import_batch.id
      )
    `,
    [userId, imports.map((item) => item.id)],
  );

  await markSectionSaved(client, 'imports', userId);
};

const replaceTransactions = async (
  client: PoolClient,
  transactionState: TransactionStorageState,
  transactions: FinanceStoreSnapshot['transactions'],
  userId: string,
) => {
  // Pre-insert placeholders for imports and categories to satisfy foreign keys
  for (const item of transactions) {
    if (item.importId) {
      await client.query(
        `
          INSERT INTO ${financeImportBatchesTableName} (
            id, file_name, date_label, row_count, status, sort_order, user_id
          )
          VALUES ($1, $2, $3, 0, 'Pending', 0, $4::uuid)
          ON CONFLICT (id) DO NOTHING
        `,
        [item.importId, item.sourceFile ?? 'Import Batch', 'Pending', userId],
      );
    }

    // Ensure custom category exists in spendlens_categories table
    const categoryType = item.category === 'Income' ? 'Income' : 'Expense';
    await client.query(
      `
        INSERT INTO spendlens_categories (name, color, type, user_id)
        VALUES ($1, '#71717a', $2, $3::uuid)
        ON CONFLICT (name, user_id) DO NOTHING
      `,
      [item.category, categoryType, userId],
    );
  }

  for (const [sortOrder, item] of transactions.entries()) {
    const entity = toPostgresFinanceTransactionEntity(
      item,
      transactionState,
      sortOrder,
      userId,
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
          user_id,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17::uuid, now()
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
          user_id = EXCLUDED.user_id,
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
        entity.user_id,
      ],
    );
  }

  await client.query(
    `
      DELETE FROM ${financeTransactionsTableName}
      WHERE transaction_state = $1
      AND user_id = $2::uuid
      AND NOT (id = ANY($3::text[]))
    `,
    [transactionState, userId, transactions.map((item) => item.id)],
  );

  await markSectionSaved(
    client,
    transactionState === 'ledger' ? 'transactions' : 'stagedTransactions',
    userId,
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

const getNormalizedRowCountForUser = async (userId: string) => {
  const result = await getPool().query<{ count: string }>(
    `
      SELECT (
        (SELECT count(*) FROM ${financeImportBatchesTableName} WHERE user_id = $1::uuid) +
        (SELECT count(*) FROM ${financeTransactionsTableName} WHERE user_id = $1::uuid)
      )::text AS count
    `,
    [userId],
  );

  return Number(result.rows[0]?.count ?? 0);
};

const migrateJsonStateTables = async (userId: string) => {
  if ((await getNormalizedRowCountForUser(userId)) > 0) {
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
      await replaceImports(client, snapshot.imports, userId);
    }

    if (snapshot.stagedTransactions) {
      await replaceTransactions(
        client,
        'staged',
        snapshot.stagedTransactions,
        userId,
      );
    }

    if (snapshot.transactions) {
      await replaceTransactions(
        client,
        'ledger',
        snapshot.transactions,
        userId,
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const ensureSchema = async (userId: string) => {
  if (!schemaReady) {
    await createNormalizedSchema(userId);
    schemaReady = true;
  }
  await migrateJsonStateTables(userId);
};

const saveWithClient = async (
  userId: string,
  action: (client: PoolClient) => Promise<void>,
) => {
  await ensureSchema(userId);

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

const getSavedSections = async (userId: string) => {
  const result = await getPool().query<FinanceStoreSectionRow>(
    `
      SELECT section_key
      FROM ${financeStoreSectionsTableName}
      WHERE user_id = $1::uuid
      AND section_key = ANY($2::text[])
    `,
    [userId, stateKeys],
  );

  return new Set(result.rows.map((row) => row.section_key));
};

const loadImports = async (userId: string) => {
  const result = await getPool().query<PostgresImportBatchEntity>(
    `
    SELECT
      id,
      file_name,
      date_label,
      duplicate_rows,
      row_count,
      status,
      sort_order,
      user_id
    FROM ${financeImportBatchesTableName}
    WHERE user_id = $1::uuid
    ORDER BY sort_order ASC, updated_at DESC, id ASC
  `,
    [userId],
  );

  return result.rows.map(fromPostgresImportBatchEntity);
};

const loadTransactions = async (
  transactionState: TransactionStorageState,
  userId: string,
) => {
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
        sort_order,
        user_id
      FROM ${financeTransactionsTableName}
      WHERE transaction_state = $1
      AND user_id = $2::uuid
      ORDER BY sort_order ASC, updated_at DESC, id ASC
    `,
    [transactionState, userId],
  );

  return result.rows.map(fromPostgresFinanceTransactionEntity);
};

type FinanceStoreRow = {
  key: FinanceStoreKey;
  value: unknown;
};

export const postgresFinanceStore: FinanceStore = {
  load: async (userId) => {
    if (!userId) {
      throw new Error('Unauthorized: User ID is required.');
    }
    await ensureSchema(userId);

    const savedSections = await getSavedSections(userId);
    const imports = await loadImports(userId);
    const stagedTransactions = await loadTransactions('staged', userId);
    const transactions = await loadTransactions('ledger', userId);

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
  saveImports: (imports, userId) => {
    if (!userId) {
      throw new Error('Unauthorized: User ID is required.');
    }
    return saveWithClient(userId, (client) =>
      replaceImports(client, imports, userId),
    );
  },
  saveStagedTransactions: (stagedTransactions, userId) => {
    if (!userId) {
      throw new Error('Unauthorized: User ID is required.');
    }
    return saveWithClient(userId, (client) =>
      replaceTransactions(client, 'staged', stagedTransactions, userId),
    );
  },
  saveTransactions: (transactions, userId) => {
    if (!userId) {
      throw new Error('Unauthorized: User ID is required.');
    }
    return saveWithClient(userId, (client) =>
      replaceTransactions(client, 'ledger', transactions, userId),
    );
  },
};

export const loadUserSettings = async (
  userId: string,
): Promise<unknown | null> => {
  await ensureSchema(userId);
  const result = await getPool().query<{ settings: unknown }>(
    `SELECT settings FROM spendlens_user_settings WHERE user_id = $1::uuid`,
    [userId],
  );
  return result.rows[0]?.settings ?? null;
};

export const saveUserSettings = async (
  userId: string,
  settings: unknown,
): Promise<void> => {
  await ensureSchema(userId);
  await getPool().query(
    `
      INSERT INTO spendlens_user_settings (user_id, settings, updated_at)
      VALUES ($1::uuid, $2, now())
      ON CONFLICT (user_id)
      DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()
    `,
    [userId, JSON.stringify(settings)],
  );
};
