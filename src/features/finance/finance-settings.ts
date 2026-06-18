import { categories as seedCategories } from '@/features/finance/data';

export const uncategorizedCategory = 'Uncategorized';
export const defaultOllamaEndpoint = 'http://localhost:11434';
export const defaultOllamaModel = 'gemma4:12b';

export type FinanceSettings = {
  categories: string[];
  ollamaEndpoint: string;
  ollamaModel: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const normalizeOllamaEndpoint = (
  endpoint: unknown,
  fallback = defaultOllamaEndpoint,
) => {
  const value = typeof endpoint === 'string' ? endpoint.trim() : '';

  return (value || fallback).replace(/\/+$/, '');
};

export const normalizeOllamaModel = (
  model: unknown,
  fallback = defaultOllamaModel,
) => {
  const value = typeof model === 'string' ? model.trim() : '';

  return value || fallback;
};

export const normalizeCategories = (value: unknown): string[] => {
  const source = Array.isArray(value) ? value : seedCategories;
  const names = source
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  const categories = names.length > 0 ? names : seedCategories;
  const seen = new Set<string>();
  const normalized = categories.filter((category) => {
    if (category === uncategorizedCategory) {
      return false;
    }

    const key = category.toLocaleLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });

  return [...normalized, uncategorizedCategory];
};

export const defaultFinanceSettings: FinanceSettings = {
  categories: normalizeCategories(seedCategories),
  ollamaEndpoint: defaultOllamaEndpoint,
  ollamaModel: defaultOllamaModel,
};

export const normalizeFinanceSettings = (value: unknown): FinanceSettings => {
  if (!isRecord(value)) {
    return defaultFinanceSettings;
  }

  return {
    categories: normalizeCategories(value.categories),
    ollamaEndpoint: normalizeOllamaEndpoint(value.ollamaEndpoint),
    ollamaModel: normalizeOllamaModel(value.ollamaModel),
  };
};
