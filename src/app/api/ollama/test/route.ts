import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import {
  normalizeOllamaEndpoint,
  normalizeOllamaModel,
} from '@/features/finance/finance-settings';
import { normalizeSafeOllamaEndpoint } from '@/features/finance/ollama-endpoint-security';
import { isSameOriginRequest } from '@/utils/request-security';

export const runtime = 'nodejs';

type TestOllamaRequest = {
  ollamaEndpoint?: unknown;
  ollamaModel?: unknown;
};

type OllamaTagsResponse = {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
};

const connectionTimeoutMs = 10_000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        message: 'Cross-origin Ollama test requests are not allowed.',
        ok: false,
      },
      { status: 403 },
    );
  }

  let body: TestOllamaRequest = {};

  try {
    body = (await request.json()) as TestOllamaRequest;
  } catch {
    body = {};
  }

  let endpoint: string;

  try {
    endpoint = normalizeSafeOllamaEndpoint(
      normalizeOllamaEndpoint(body.ollamaEndpoint, env.OLLAMA_ENDPOINT),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Ollama endpoint is not a valid URL.',
        ok: false,
      },
      { status: 400 },
    );
  }

  const model = normalizeOllamaModel(body.ollamaModel, env.OLLAMA_MODEL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), connectionTimeoutMs);

  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          message: `Ollama returned ${response.status} while listing models.`,
          ok: false,
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    const availableModels =
      payload.models
        ?.map((item) => item.name ?? item.model)
        .filter((item): item is string => Boolean(item)) ?? [];
    const hasRequestedModel = availableModels.includes(model);

    if (availableModels.length === 0) {
      return NextResponse.json({
        availableModels,
        message: `Connected to ${endpoint}, but Ollama has no installed models.`,
        ok: false,
      });
    }

    if (!hasRequestedModel) {
      return NextResponse.json({
        availableModels,
        message: `Connected to ${endpoint}, but ${model} is not installed.`,
        model,
        ok: false,
      });
    }

    return NextResponse.json({
      availableModels,
      message: `Connected to ${endpoint} with ${model}.`,
      model,
      ok: true,
    });
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? `Ollama did not respond within ${connectionTimeoutMs / 1000} seconds.`
        : error instanceof Error
          ? error.message
          : 'Could not connect to Ollama.';

    return NextResponse.json(
      {
        message,
        ok: false,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
