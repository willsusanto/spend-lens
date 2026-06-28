import { categories as seedCategories } from '@/features/finance/data';

export const uncategorizedCategory = 'Uncategorized';
export const defaultOllamaEndpoint = 'http://localhost:11434';
export const defaultOllamaModel = 'gemma4:12b';

export type CategoryColorMap = Record<string, string>;

export type FinanceSettings = {
  categories: string[];
  categoryColors: CategoryColorMap;
  ollamaEndpoint: string;
  ollamaModel: string;
};

const defaultCategoryColorPalette = [
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#4f46e5',
  '#475569',
  '#71717a',
];

const hexColorPattern = /^#[0-9a-f]{6}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const normalizeCategoryColor = (
  color: unknown,
  fallback = defaultCategoryColorPalette[0],
) => {
  const value = typeof color === 'string' ? color.trim() : '';

  return hexColorPattern.test(value) ? value.toLocaleLowerCase() : fallback;
};

export const getDefaultCategoryColor = (category: string, index: number) => {
  if (category === uncategorizedCategory) {
    return '#71717a';
  }

  return defaultCategoryColorPalette[
    index % defaultCategoryColorPalette.length
  ];
};

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

const getStoredCategoryColor = (
  categoryColors: Record<string, unknown>,
  category: string,
) => {
  if (category in categoryColors) {
    return categoryColors[category];
  }

  const matchingKey = Object.keys(categoryColors).find(
    (key) => key.toLocaleLowerCase() === category.toLocaleLowerCase(),
  );

  return matchingKey ? categoryColors[matchingKey] : undefined;
};

export const createDefaultCategoryColors = (
  categories: string[],
): CategoryColorMap =>
  Object.fromEntries(
    categories.map((category, index) => [
      category,
      getDefaultCategoryColor(category, index),
    ]),
  );

export const normalizeCategoryColors = (
  value: unknown,
  categories: string[],
): CategoryColorMap => {
  const source = isRecord(value) ? value : {};

  return Object.fromEntries(
    categories.map((category, index) => {
      const fallback = getDefaultCategoryColor(category, index);

      return [
        category,
        normalizeCategoryColor(
          getStoredCategoryColor(source, category),
          fallback,
        ),
      ];
    }),
  );
};

export const getCategoryColor = (
  category: string,
  categoryColors: CategoryColorMap,
  fallbackIndex = 0,
) =>
  normalizeCategoryColor(
    categoryColors[category],
    getDefaultCategoryColor(category, fallbackIndex),
  );

const defaultCategories = normalizeCategories(seedCategories);

export const defaultFinanceSettings: FinanceSettings = {
  categories: defaultCategories,
  categoryColors: createDefaultCategoryColors(defaultCategories),
  ollamaEndpoint: defaultOllamaEndpoint,
  ollamaModel: defaultOllamaModel,
};

export const normalizeFinanceSettings = (value: unknown): FinanceSettings => {
  if (!isRecord(value)) {
    return defaultFinanceSettings;
  }

  const categories = normalizeCategories(value.categories);

  return {
    categories,
    categoryColors: normalizeCategoryColors(value.categoryColors, categories),
    ollamaEndpoint: normalizeOllamaEndpoint(value.ollamaEndpoint),
    ollamaModel: normalizeOllamaModel(value.ollamaModel),
  };
};
