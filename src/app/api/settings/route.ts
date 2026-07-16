import { NextResponse } from 'next/server';

import {
  loadUserSettings,
  saveUserSettings,
} from '@/features/finance/postgres-finance-store';
import { isSameOriginRequest } from '@/utils/request-security';

export const runtime = 'nodejs';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const toErrorResponse = (error: unknown) => {
  console.error(
    '[settings-api] database request failed',
    error instanceof Error
      ? {
          message: error.message,
          name: error.name,
        }
      : { message: 'Unknown error' },
  );
  return NextResponse.json(
    { error: 'Settings database request failed. Check the server logs.' },
    { status: 500 },
  );
};

const toForbiddenResponse = () =>
  NextResponse.json(
    { error: 'Cross-origin settings requests are not allowed.' },
    { status: 403 },
  );

const getAuthenticatedUserId = (request: Request): string => {
  const headerUserId = request.headers.get('x-user-id');

  if (
    headerUserId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      headerUserId,
    )
  ) {
    return headerUserId;
  }

  return '00000000-0000-0000-0000-000000000000';
};

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return toForbiddenResponse();
  }

  try {
    const userId = getAuthenticatedUserId(request);
    const settings = await loadUserSettings(userId);

    return NextResponse.json(settings ?? {});
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return toForbiddenResponse();
  }

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
    const userId = getAuthenticatedUserId(request);
    await saveUserSettings(userId, body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
