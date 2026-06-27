import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import {
  FinanceStatus,
  FinanceTransaction,
  categories as seedCategories,
} from '@/features/finance/data';
import {
  normalizeCategories,
  normalizeOllamaEndpoint,
  normalizeOllamaModel,
} from '@/features/finance/finance-settings';
import {
  applyCategorizationFallback,
  applyCategorizedResponse,
  buildCategorizationPrompt,
  extractCategorizedJson,
  getCategorizationResponseStatus,
  getFormatName,
  isObjectRecord,
  OllamaCategorizedResponse,
  OllamaGenerateFormat,
} from '@/features/finance/ollama-categorization';

export const runtime = 'nodejs';

type CategorizeRequest = {
  settings?: {
    categories?: unknown;
    ollamaEndpoint?: unknown;
    ollamaModel?: unknown;
  };
  transactions?: FinanceTransaction[];
};

type OllamaGenerateResponse = {
  response?: string;
  done?: boolean;
  done_reason?: string;
  error?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
};

type OllamaTagsResponse = {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
};

type CategorizeResponse = {
  transactions: FinanceTransaction[];
  source: 'ollama' | 'manual-review';
  status: FinanceStatus;
  model?: string;
  error?: string;
};

const logOllama = (message: string, context?: Record<string, unknown>) => {
  console.log(`[ollama] ${message}`, context ?? {});
};

const truncateForLog = (value = '', maxLength = 2_000) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const getInstalledModel = async (endpoint: string) => {
  logOllama('Listing installed models', { endpoint });

  const response = await fetch(`${endpoint}/api/tags`);

  if (!response.ok) {
    logOllama('Model list request failed', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Could not list Ollama models: ${response.status}.`);
  }

  const payload = (await response.json()) as OllamaTagsResponse;
  const model = payload.models?.find((item) => item.name || item.model);
  const installedModel = model?.name ?? model?.model;

  logOllama('Installed model probe complete', {
    endpoint,
    model: installedModel,
    modelCount: payload.models?.length ?? 0,
  });

  return installedModel;
};

const generateCategories = async (
  endpoint: string,
  model: string,
  allowedCategories: string[],
  transactions: FinanceTransaction[],
  format: OllamaGenerateFormat = 'json',
) => {
  const prompt = buildCategorizationPrompt(transactions, allowedCategories);
  const formatName = getFormatName(format);

  logOllama('Generating categories', {
    endpoint,
    model,
    format: formatName,
    promptLength: prompt.length,
    transactionCount: transactions.length,
  });

  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format,
      options: {
        temperature: 0,
        num_ctx: 8192,
      },
    }),
  });

  if (!response.ok) {
    logOllama('Generate request failed', {
      endpoint,
      model,
      format: formatName,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Ollama returned ${response.status}.`);
  }

  const payload = (await response.json()) as OllamaGenerateResponse;

  logOllama('Generate request complete', {
    endpoint,
    model,
    format: formatName,
    done: payload.done,
    doneReason: payload.done_reason,
    error: payload.error,
    hasResponse: Boolean(payload.response),
    responseLength: payload.response?.length ?? 0,
    promptEvalCount: payload.prompt_eval_count,
    evalCount: payload.eval_count,
    totalDuration: payload.total_duration,
  });
  logOllama('Raw generate response', {
    endpoint,
    model,
    format: formatName,
    response: truncateForLog(payload.response),
  });

  if (!payload.response?.trim() && format !== 'json') {
    logOllama('Empty schema response, retrying with json mode', {
      endpoint,
      model,
      promptLength: prompt.length,
      transactionCount: transactions.length,
    });

    return generateCategories(
      endpoint,
      model,
      allowedCategories,
      transactions,
      'json',
    );
  }

  return payload;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CategorizeRequest;
  const transactions = body.transactions ?? [];

  if (!Array.isArray(transactions)) {
    return NextResponse.json(
      { error: 'Expected transactions to be an array.' },
      { status: 400 },
    );
  }

  if (transactions.length === 0) {
    return NextResponse.json({
      transactions: [],
      source: 'manual-review',
      status: 'Review',
    } satisfies CategorizeResponse);
  }

  const requestSettings = isObjectRecord(body.settings) ? body.settings : {};
  const allowedCategories = normalizeCategories(
    requestSettings.categories ?? seedCategories,
  );
  const endpoint = normalizeOllamaEndpoint(
    requestSettings.ollamaEndpoint,
    env.OLLAMA_ENDPOINT,
  );
  const model = normalizeOllamaModel(
    requestSettings.ollamaModel,
    env.OLLAMA_MODEL,
  );

  logOllama('Categorization request received', {
    endpoint,
    model,
    transactionCount: transactions.length,
  });

  try {
    let activeModel = model;
    let payload: OllamaGenerateResponse;

    try {
      payload = await generateCategories(
        endpoint,
        activeModel,
        allowedCategories,
        transactions,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';

      if (!detail.includes('404')) {
        throw error;
      }

      logOllama('Configured model was not found, probing installed models', {
        endpoint,
        configuredModel: activeModel,
      });

      const installedModel = await getInstalledModel(endpoint);

      if (!installedModel) {
        throw new Error('Ollama has no installed models.');
      }

      activeModel = installedModel;
      payload = await generateCategories(
        endpoint,
        activeModel,
        allowedCategories,
        transactions,
      );
    }

    let categorized: OllamaCategorizedResponse;

    try {
      categorized = extractCategorizedJson(payload.response ?? '');
    } catch (error) {
      logOllama('Could not parse generate response', {
        endpoint,
        model: activeModel,
        error: error instanceof Error ? error.message : 'Unknown error.',
        response: truncateForLog(payload.response),
      });
      throw error;
    }

    const result = applyCategorizedResponse({
      allowedCategories,
      model: activeModel,
      response: categorized,
      transactions,
    });

    if (result.validItemCount !== transactions.length) {
      logOllama('Generate response item count mismatch', {
        endpoint,
        model: activeModel,
        expectedCount: transactions.length,
        validItemCount: result.validItemCount,
        rawItemCount: result.rawItemCount,
        response: truncateForLog(payload.response),
      });
    }

    logOllama('Categorization request succeeded', {
      endpoint,
      model: activeModel,
      transactionCount: result.transactions.length,
    });

    return NextResponse.json({
      transactions: result.transactions,
      source: 'ollama',
      status: getCategorizationResponseStatus(result.transactions),
      model: activeModel,
    } satisfies CategorizeResponse);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error.';

    logOllama('AI categorization failed; marking rows for manual review', {
      endpoint,
      model,
      transactionCount: transactions.length,
      error: detail,
    });

    return NextResponse.json({
      transactions: applyCategorizationFallback(transactions, detail),
      source: 'manual-review',
      status: 'Review',
      error: detail,
    } satisfies CategorizeResponse);
  }
}
