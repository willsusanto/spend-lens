import { NextResponse } from 'next/server';

import {
  CategorizationSource,
  FinanceTransaction,
  TransactionStatus,
} from '@/features/finance/data';

export const runtime = 'nodejs';

type CategorizeRequest = {
  transactions?: FinanceTransaction[];
};

type OllamaGenerateResponse = {
  response?: string;
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

const categories = [
  'Income',
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Subscriptions',
  'Shopping',
  'Transfer',
  'Software',
  'Utilities',
  'Health',
  'Travel',
  'Uncategorized',
] as const;

const clampConfidence = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 31;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const getStatus = (category: string, confidence: number): TransactionStatus =>
  category === 'Uncategorized' || confidence < 70 ? 'Review' : 'Pending';

const extractJson = (value: string) => {
  const trimmed = value.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start < 0 || end < start) {
    throw new Error('Ollama response did not contain a JSON object.');
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as OllamaCategorizedResponse;
};

const applyFallback = (
  transactions: FinanceTransaction[],
  detail: string,
): FinanceTransaction[] =>
  transactions.map((transaction) => ({
    ...transaction,
    status: getStatus(transaction.category, transaction.confidence),
    aiReason: `Ollama was unavailable, so this row is using the local CSV rule result. ${detail}`,
    categorizationSource: 'heuristic' satisfies CategorizationSource,
  }));

const buildPrompt = (transactions: FinanceTransaction[]) => `
You categorize personal bank transactions for a local-first finance app.

Return only JSON in this exact shape:
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

Rules:
- Use Income only for credits, salary, payouts, deposits, refunds, or incoming transfers.
- Use Transfer for person-to-person or account movement when no spending category is clear.
- Use Uncategorized when the merchant or description is too ambiguous.
- Evaluate each row independently. Do not copy merchant details from another row.
- The reason must only cite text present in that row or the category rule used.
- Confidence is 0-100. Use under 70 when a human should review it.
- Keep each reason under 14 words.

Transactions:
${JSON.stringify(
  transactions.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    merchant: transaction.merchant,
    description: transaction.description,
    amount: transaction.amount,
    currentCategory: transaction.category,
    currentConfidence: transaction.confidence,
  })),
)}
`;

const getInstalledModel = async (endpoint: string) => {
  const response = await fetch(`${endpoint}/api/tags`);

  if (!response.ok) {
    throw new Error(`Could not list Ollama models: ${response.status}.`);
  }

  const payload = (await response.json()) as OllamaTagsResponse;
  const model = payload.models?.find((item) => item.name || item.model);

  return model?.name ?? model?.model;
};

const generateCategories = async (
  endpoint: string,
  model: string,
  transactions: FinanceTransaction[],
) => {
  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(transactions),
      stream: false,
      format: 'json',
      options: {
        temperature: 0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}.`);
  }

  return (await response.json()) as OllamaGenerateResponse;
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
      source: 'heuristic',
      status: 'No rows',
    });
  }

  const endpoint = (
    process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434'
  ).replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL ?? 'llama3.1';

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

      const installedModel = await getInstalledModel(endpoint);

      if (!installedModel) {
        throw new Error('Ollama has no installed models.');
      }

      activeModel = installedModel;
      payload = await generateCategories(endpoint, activeModel, transactions);
    }

    const categorized = extractJson(payload.response ?? '{}');
    const byId = new Map(
      (categorized.items ?? [])
        .filter((item): item is Required<OllamaCategorizedItem> =>
          Boolean(item.id && item.category && item.reason),
        )
        .map((item) => [item.id, item]),
    );

    const updatedTransactions = transactions.map((transaction) => {
      const result = byId.get(transaction.id);

      if (!result) {
        return {
          ...transaction,
          status: getStatus(transaction.category, transaction.confidence),
          aiReason:
            'Ollama did not return a category for this row; local rule retained.',
          categorizationSource: 'heuristic' satisfies CategorizationSource,
        };
      }

      const confidence = clampConfidence(result.confidence);
      const category = categories.includes(
        result.category as (typeof categories)[number],
      )
        ? result.category
        : 'Uncategorized';

      return {
        ...transaction,
        category,
        confidence,
        status: getStatus(category, confidence),
        aiReason: result.reason,
        categorizationSource: 'ollama' satisfies CategorizationSource,
        ollamaModel: activeModel,
      };
    });

    return NextResponse.json({
      transactions: updatedTransactions,
      source: 'ollama',
      status: 'AI categorized',
      model: activeModel,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error.';

    return NextResponse.json({
      transactions: applyFallback(transactions, detail),
      source: 'heuristic',
      status: 'Heuristic fallback',
      error: detail,
    });
  }
}
