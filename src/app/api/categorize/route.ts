import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import {
  CategorizationSource,
  FinanceStatus,
  FinanceTransaction,
  TransactionStatus,
} from '@/features/finance/data';

export const runtime = 'nodejs';

type CategorizeRequest = {
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

type OllamaCategorizedItem = {
  id?: string;
  category?: string;
  confidence?: number;
  reason?: string;
};

type OllamaCategorizedResponse = {
  items?: OllamaCategorizedItem[];
};

type CategorizeResponse = {
  transactions: FinanceTransaction[];
  source: 'ollama' | 'manual-review';
  status: FinanceStatus;
  model?: string;
  error?: string;
};

type OllamaCategorizedEnvelope = {
  items?: unknown;
  transactions?: unknown;
};

const categories = [
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
] as const;

const categoryGuidance = [
  'Income: credits, salary, payouts, deposits, refunds, or incoming transfers.',
  'Bills / Utilities: PLN, water/air, internet, IPL, utilities, recurring bills.',
  'Transport: bensin, ojol, ride hailing, parking/parkir, tolls, public transport.',
  'Groceries: bahan makanan, household stock/stok rumah, supermarket, minimarket.',
  'Eating Out: meals or drinks consumed directly, restaurants, cafes, coffee, makan/minum.',
  'Shopping: goods, clothes/pakaian, skincare, personal items, ecommerce purchases.',
  'Entertainment: hiburan, games, cinema/nonton, events, recreation.',
  'Subscriptions: monthly subscriptions/langganan bulanan, streaming, software subscriptions.',
  'Savings / Investment: savings/tabungan, investments/investasi, brokerage, deposits set aside.',
  'Donations: donasi, zakat, charity, religious giving.',
  'Misc: lain-lain, rare one-off expenses when no better category fits.',
  'Uncategorized: use when the description is too ambiguous or confidence is low.',
] as const;

const logOllama = (message: string, context?: Record<string, unknown>) => {
  console.log(`[ollama] ${message}`, context ?? {});
};

const truncateForLog = (value = '', maxLength = 2_000) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

type OllamaGenerateFormat = Record<string, unknown> | 'json';

const getFormatName = (format: OllamaGenerateFormat) =>
  typeof format === 'string' ? format : 'schema';

const clampConfidence = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 31;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const getStatus = (category: string, confidence: number): TransactionStatus =>
  category === 'Uncategorized' || confidence < 70 ? 'Review' : 'Pending';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isCategorizedItem = (
  item: unknown,
): item is Required<OllamaCategorizedItem> => {
  if (!isObjectRecord(item)) {
    return false;
  }

  return (
    typeof item.id === 'string' &&
    typeof item.category === 'string' &&
    typeof item.reason === 'string' &&
    item.confidence !== undefined
  );
};

const getJsonSlice = (value: string, startChar: string, endChar: string) => {
  const start = value.indexOf(startChar);
  const end = value.lastIndexOf(endChar);

  if (start < 0 || end < start) {
    return;
  }

  return value.slice(start, end + 1);
};

const parseJsonText = (value: string): unknown => {
  const trimmed = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (!trimmed) {
    throw new Error('Ollama returned an empty response.');
  }

  const candidates = [
    trimmed,
    getJsonSlice(trimmed, '{', '}'),
    getJsonSlice(trimmed, '[', ']'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Ollama response did not contain parseable JSON.');
};

const normalizeCategorizedResponse = (
  value: unknown,
): OllamaCategorizedResponse => {
  if (typeof value === 'string') {
    return normalizeCategorizedResponse(parseJsonText(value));
  }

  if (Array.isArray(value)) {
    return { items: value as OllamaCategorizedItem[] };
  }

  if (value && typeof value === 'object') {
    const envelope = value as OllamaCategorizedEnvelope;

    if (Array.isArray(envelope.items)) {
      return { items: envelope.items as OllamaCategorizedItem[] };
    }

    if (Array.isArray(envelope.transactions)) {
      return { items: envelope.transactions as OllamaCategorizedItem[] };
    }
  }

  throw new Error('Ollama JSON used an unsupported response shape.');
};

const extractJson = (value: string) => {
  return normalizeCategorizedResponse(parseJsonText(value));
};

const applyFallback = (
  transactions: FinanceTransaction[],
  detail: string,
): FinanceTransaction[] =>
  transactions.map((transaction) => ({
    ...transaction,
    confidence: Math.min(transaction.confidence, 31),
    status: 'Review' satisfies TransactionStatus,
    aiReason: `AI categorization could not be applied, so this row needs manual review. ${detail}`,
  }));

const buildPrompt = (transactions: FinanceTransaction[]) => `
You are a JSON-only transaction categorizer for a finance app.

Your entire response must be one valid JSON object. It must start with { and end with }.
Do not output markdown, code fences, comments, explanations, or trailing commas.
The "items" array must contain exactly ${transactions.length} object(s).
Every "items" array element must be an object. Never output strings or placeholders like "item_2".

Return exactly one item for each input transaction id in this exact shape:
{
  "items": [
    {
      "id": "transaction id",
      "category": "one allowed category",
      "confidence": 0,
      "reason": "short plain-English reason"
    }
  ]
}

Allowed categories:
${categories.join(', ')}

Category guidance:
${categoryGuidance.map((item) => `- ${item}`).join('\n')}

Rules:
- Copy each transaction id exactly.
- Positive amounts are credits/incoming money. Negative amounts are debits/outgoing money.
- Use Income only for credits, salary, payouts, deposits, refunds, or incoming transfers.
- Use purchase context keywords when present.
- Do not invent categories outside the allowed list.
- Indonesian bank method prefixes such as "TRSF E-BANKING DB", "TRANSAKSI DEBIT TGL", "KR OTOMATIS", QR codes, terminal ids, and reference numbers are not category evidence by themselves.
- For merged bank text, classify only when the description contains useful context like a business name, transfer note, product keyword, salary/refund wording, or category keyword.
- Use Uncategorized when the description is too ambiguous.
- If uncertain, keep the current category with confidence below 70 and explain what is missing.
- Evaluate each row independently. Do not copy details from another row.
- The reason must only cite text present in that row or the category rule used.
- Confidence is 0-100. Use under 70 when a human should review it.
- Keep each reason under 14 words.

Transactions:
${JSON.stringify(
  transactions.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    currentCategory: transaction.category,
    currentConfidence: transaction.confidence,
  })),
)}
`;

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
  transactions: FinanceTransaction[],
  format: OllamaGenerateFormat = 'json',
) => {
  const prompt = buildPrompt(transactions);
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

    return generateCategories(endpoint, model, transactions, 'json');
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

  const endpoint = env.OLLAMA_ENDPOINT.replace(/\/$/, '');
  const model = env.OLLAMA_MODEL;

  logOllama('Categorization request received', {
    endpoint,
    model,
    transactionCount: transactions.length,
  });

  try {
    let activeModel = model;
    let payload: OllamaGenerateResponse;

    try {
      payload = await generateCategories(endpoint, activeModel, transactions);
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
      payload = await generateCategories(endpoint, activeModel, transactions);
    }

    let categorized: OllamaCategorizedResponse;

    try {
      categorized = extractJson(payload.response ?? '');
    } catch (error) {
      logOllama('Could not parse generate response', {
        endpoint,
        model: activeModel,
        error: error instanceof Error ? error.message : 'Unknown error.',
        response: truncateForLog(payload.response),
      });
      throw error;
    }

    const byId = new Map(
      (categorized.items ?? [])
        .filter(isCategorizedItem)
        .map((item) => [item.id, item]),
    );

    if (byId.size !== transactions.length) {
      logOllama('Generate response item count mismatch', {
        endpoint,
        model: activeModel,
        expectedCount: transactions.length,
        validItemCount: byId.size,
        rawItemCount: categorized.items?.length ?? 0,
        response: truncateForLog(payload.response),
      });
    }

    const updatedTransactions = transactions.map((transaction) => {
      const result = byId.get(transaction.id);

      if (!result) {
        return {
          ...transaction,
          status: getStatus(transaction.category, transaction.confidence),
          aiReason:
            'Ollama did not return a category for this row; manual review needed.',
        };
      }

      const confidence = clampConfidence(result.confidence);
      const category = categories.includes(
        result.category as (typeof categories)[number],
      )
        ? result.category
        : 'Uncategorized';
      const resolvedCategory = confidence < 70 ? transaction.category : category;

      return {
        ...transaction,
        category: resolvedCategory,
        confidence,
        status: getStatus(resolvedCategory, confidence),
        aiReason: result.reason,
        categorizationSource: 'ollama' as const satisfies CategorizationSource,
        ollamaModel: activeModel,
      };
    });

    logOllama('Categorization request succeeded', {
      endpoint,
      model: activeModel,
      transactionCount: updatedTransactions.length,
    });

    return NextResponse.json({
      transactions: updatedTransactions,
      source: 'ollama',
      status: updatedTransactions.some(
        (transaction) => transaction.status === 'Review',
      )
        ? 'Review'
        : 'Pending',
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
      transactions: applyFallback(transactions, detail),
      source: 'manual-review',
      status: 'Review',
      error: detail,
    } satisfies CategorizeResponse);
  }
}
