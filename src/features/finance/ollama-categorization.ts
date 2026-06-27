import {
  FinanceStatus,
  FinanceTransaction,
  TransactionStatus,
} from '@/features/finance/data';

export type OllamaCategorizedItem = {
  category?: string;
  confidence?: unknown;
  id?: string;
  reason?: string;
};

export type OllamaCategorizedResponse = {
  items?: OllamaCategorizedItem[];
};

export type OllamaCategorizedItemResult = {
  category: string;
  confidence: unknown;
  id: string;
  reason: string;
};

export type OllamaGenerateFormat = Record<string, unknown> | 'json';

type OllamaCategorizedEnvelope = {
  items?: unknown;
  transactions?: unknown;
};

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

export const getFormatName = (format: OllamaGenerateFormat) =>
  typeof format === 'string' ? format : 'schema';

export const clampCategorizationConfidence = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 31;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export const getCategorizationStatus = (
  category: string,
  confidence: number,
): TransactionStatus =>
  category === 'Uncategorized' || confidence < 70 ? 'Review' : 'Pending';

export const isObjectRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const isCategorizedItem = (
  item: unknown,
): item is OllamaCategorizedItemResult => {
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

export const parseJsonText = (value: string): unknown => {
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

export const normalizeCategorizedResponse = (
  value: unknown,
): OllamaCategorizedResponse => {
  if (typeof value === 'string') {
    return normalizeCategorizedResponse(parseJsonText(value));
  }

  if (Array.isArray(value)) {
    return { items: value as OllamaCategorizedItem[] };
  }

  if (isObjectRecord(value)) {
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

export const extractCategorizedJson = (value: string) => {
  return normalizeCategorizedResponse(parseJsonText(value));
};

export const applyCategorizationFallback = (
  transactions: FinanceTransaction[],
  detail: string,
): FinanceTransaction[] =>
  transactions.map((transaction) => ({
    ...transaction,
    aiReason: `AI categorization could not be applied, so this row needs manual review. ${detail}`,
    confidence: Math.min(transaction.confidence, 31),
    status: 'Review' satisfies TransactionStatus,
  }));

export type CategorizationUpdateResult = {
  rawItemCount: number;
  transactions: FinanceTransaction[];
  validItemCount: number;
};

export const applyCategorizedResponse = ({
  allowedCategories,
  model,
  response,
  transactions,
}: {
  allowedCategories: string[];
  model: string;
  response: OllamaCategorizedResponse;
  transactions: FinanceTransaction[];
}): CategorizationUpdateResult => {
  const byId = new Map(
    (response.items ?? [])
      .filter(isCategorizedItem)
      .map((item) => [item.id, item]),
  );

  return {
    rawItemCount: response.items?.length ?? 0,
    transactions: transactions.map((transaction) => {
      const result = byId.get(transaction.id);

      if (!result) {
        return {
          ...transaction,
          aiReason:
            'Ollama did not return a category for this row; manual review needed.',
          status: getCategorizationStatus(
            transaction.category,
            transaction.confidence,
          ),
        };
      }

      const confidence = clampCategorizationConfidence(result.confidence);
      const category = allowedCategories.includes(result.category)
        ? result.category
        : 'Uncategorized';
      const resolvedCategory =
        confidence < 70 ? transaction.category : category;

      return {
        ...transaction,
        aiReason: result.reason,
        categorizationSource: 'ollama',
        category: resolvedCategory,
        confidence,
        ollamaModel: model,
        status: getCategorizationStatus(resolvedCategory, confidence),
      };
    }),
    validItemCount: byId.size,
  };
};

export const getCategorizationResponseStatus = (
  transactions: FinanceTransaction[],
): FinanceStatus =>
  transactions.some((transaction) => transaction.status === 'Review')
    ? 'Review'
    : 'Pending';

export const buildCategorizationPrompt = (
  transactions: FinanceTransaction[],
  categories: string[],
) => `
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
    amount: transaction.amount,
    currentCategory: transaction.category,
    currentConfidence: transaction.confidence,
    date: transaction.date,
    description: transaction.description,
    id: transaction.id,
  })),
)}
`;
