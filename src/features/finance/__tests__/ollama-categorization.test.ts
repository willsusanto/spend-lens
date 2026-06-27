import { describe, expect, test } from 'vitest';

import { FinanceTransaction } from '@/features/finance/data';
import {
  applyCategorizationFallback,
  buildCategorizationPrompt,
  clampCategorizationConfidence,
  extractCategorizedJson,
  getCategorizationStatus,
  isCategorizedItem,
  normalizeCategorizedResponse,
  parseJsonText,
} from '@/features/finance/ollama-categorization';

const createTransaction = (
  transaction: Partial<FinanceTransaction>,
): FinanceTransaction => ({
  amount: -100,
  category: 'Uncategorized',
  confidence: 31,
  date: 'Jun 18, 2026',
  description: 'Coffee Shop',
  id: 'transaction',
  status: 'Review',
  ...transaction,
});

describe('ollama categorization helpers', () => {
  test('parses fenced and embedded JSON responses', () => {
    expect(parseJsonText('```json\n{"items":[]}\n```')).toEqual({
      items: [],
    });
    expect(
      extractCategorizedJson('prefix {"items":[{"id":"one"}]} suffix'),
    ).toEqual({
      items: [{ id: 'one' }],
    });
  });

  test('normalizes supported response envelope shapes', () => {
    expect(normalizeCategorizedResponse([{ id: 'one' }])).toEqual({
      items: [{ id: 'one' }],
    });
    expect(
      normalizeCategorizedResponse({
        transactions: [{ id: 'two' }],
      }),
    ).toEqual({
      items: [{ id: 'two' }],
    });
  });

  test('validates categorized items and confidence/status rules', () => {
    expect(
      isCategorizedItem({
        category: 'Groceries',
        confidence: '72',
        id: 'one',
        reason: 'Cafe merchant',
      }),
    ).toBe(true);
    expect(clampCategorizationConfidence('72.4')).toBe(72);
    expect(clampCategorizationConfidence(140)).toBe(100);
    expect(clampCategorizationConfidence('not-number')).toBe(31);
    expect(getCategorizationStatus('Groceries', 70)).toBe('Pending');
    expect(getCategorizationStatus('Groceries', 69)).toBe('Review');
    expect(getCategorizationStatus('Uncategorized', 99)).toBe('Review');
  });

  test('builds prompts with allowed categories and transaction payloads', () => {
    const prompt = buildCategorizationPrompt(
      [createTransaction({ id: 'row-1', description: 'Cafe ABC' })],
      ['Groceries', 'Eating Out', 'Uncategorized'],
    );

    expect(prompt).toContain('Groceries, Eating Out, Uncategorized');
    expect(prompt).toContain('"id":"row-1"');
    expect(prompt).toContain('"description":"Cafe ABC"');
    expect(prompt).toContain('The "items" array must contain exactly 1');
  });

  test('marks failed categorization rows for manual review', () => {
    const [fallback] = applyCategorizationFallback(
      [
        createTransaction({
          category: 'Groceries',
          confidence: 88,
          status: 'Pending',
        }),
      ],
      'Ollama unavailable.',
    );

    expect(fallback).toMatchObject({
      aiReason:
        'AI categorization could not be applied, so this row needs manual review. Ollama unavailable.',
      category: 'Groceries',
      confidence: 31,
      status: 'Review',
    });
  });
});
