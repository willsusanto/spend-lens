import { NextResponse } from 'next/server';

import {
  normalizeFinanceImports,
  normalizeFinanceTransactions,
} from '@/features/finance/finance-store';
import { postgresFinanceStore } from '@/features/finance/postgres-finance-store';

export const runtime = 'nodejs';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const toErrorResponse = (error: unknown) => {
  console.error('[finance-store] database request failed', error);
  const message =
    error instanceof Error && error.message.includes('DATABASE_URL')
      ? error.message
      : 'Finance database request failed. Check the server logs and database settings.';

  return NextResponse.json({ error: message }, { status: 500 });
};

export async function GET() {
  try {
    return NextResponse.json(await postgresFinanceStore.load());
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Expected a JSON request body.' },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: 'Expected a JSON object request body.' },
      { status: 400 },
    );
  }

  try {
    if ('imports' in body) {
      if (!Array.isArray(body.imports)) {
        return NextResponse.json(
          { error: 'Expected imports to be an array.' },
          { status: 400 },
        );
      }

      await postgresFinanceStore.saveImports(
        normalizeFinanceImports(body.imports),
      );
    }

    if ('stagedTransactions' in body) {
      if (!Array.isArray(body.stagedTransactions)) {
        return NextResponse.json(
          { error: 'Expected stagedTransactions to be an array.' },
          { status: 400 },
        );
      }

      await postgresFinanceStore.saveStagedTransactions(
        normalizeFinanceTransactions(body.stagedTransactions),
      );
    }

    if ('transactions' in body) {
      if (!Array.isArray(body.transactions)) {
        return NextResponse.json(
          { error: 'Expected transactions to be an array.' },
          { status: 400 },
        );
      }

      await postgresFinanceStore.saveTransactions(
        normalizeFinanceTransactions(body.transactions),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
