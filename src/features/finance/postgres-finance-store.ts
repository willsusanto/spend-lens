import { Pool } from 'pg';

import { env } from '@/config/env';
import {
  FinanceStore,
  FinanceStoreSnapshot,
  normalizeFinanceImports,
  normalizeFinanceStoreSnapshot,
  normalizeFinanceTransactions,
} from '@/features/finance/finance-store';

type FinanceStoreKey = keyof FinanceStoreSnapshot;

type FinanceStoreRow = {
  key: FinanceStoreKey;
  value: unknown;
};

const tableName = 'spendlens_finance_state';
const legacyTableName = 'ledgerlocal_finance_state';
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

const ensureSchema = async () => {
  if (schemaReady) {
    return;
  }

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await getPool().query(`
    DO $$
    BEGIN
      IF to_regclass('${legacyTableName}') IS NOT NULL THEN
        INSERT INTO ${tableName} (key, value, updated_at)
        SELECT key, value, updated_at
        FROM ${legacyTableName}
        ON CONFLICT (key) DO NOTHING;
      END IF;
    END $$;
  `);

  schemaReady = true;
};

const saveStateValue = async <Key extends FinanceStoreKey>(
  key: Key,
  value: FinanceStoreSnapshot[Key],
) => {
  await ensureSchema();
  await getPool().query(
    `
      INSERT INTO ${tableName} (key, value, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `,
    [key, JSON.stringify(value)],
  );
};

export const postgresFinanceStore: FinanceStore = {
  load: async () => {
    await ensureSchema();

    const result = await getPool().query<FinanceStoreRow>(
      `SELECT key, value FROM ${tableName} WHERE key = ANY($1::text[])`,
      [stateKeys],
    );
    const snapshot: Partial<FinanceStoreSnapshot> = {};

    result.rows.forEach((row) => {
      if (row.key === 'imports') {
        snapshot.imports = Array.isArray(row.value)
          ? normalizeFinanceImports(row.value)
          : undefined;
      }

      if (row.key === 'stagedTransactions') {
        snapshot.stagedTransactions = Array.isArray(row.value)
          ? normalizeFinanceTransactions(row.value)
          : undefined;
      }

      if (row.key === 'transactions') {
        snapshot.transactions = Array.isArray(row.value)
          ? normalizeFinanceTransactions(row.value)
          : undefined;
      }
    });

    return normalizeFinanceStoreSnapshot(snapshot);
  },
  saveImports: (imports) => saveStateValue('imports', imports),
  saveStagedTransactions: (stagedTransactions) =>
    saveStateValue('stagedTransactions', stagedTransactions),
  saveTransactions: (transactions) =>
    saveStateValue('transactions', transactions),
};
