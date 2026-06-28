'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  defaultFinanceSettings,
  FinanceSettings,
  getCategoryColor,
  getDefaultCategoryColor,
  normalizeCategories,
  normalizeCategoryColor,
  normalizeCategoryColors,
  normalizeFinanceSettings,
  normalizeOllamaEndpoint,
  normalizeOllamaModel,
  uncategorizedCategory,
} from '@/features/finance/finance-settings';

const settingsStorageKey = {
  current: 'spendlens.settings',
  legacy: ['ledgerlocal.settings'],
};

type OllamaSettingsInput = {
  ollamaEndpoint: string;
  ollamaModel: string;
};

type FinanceSettingsContextValue = FinanceSettings & {
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  hydrated: boolean;
  resetCategories: () => void;
  saveOllamaSettings: (settings: OllamaSettingsInput) => void;
  updateCategoryColor: (category: string, color: string) => void;
};

const FinanceSettingsContext =
  createContext<FinanceSettingsContextValue | null>(null);

const readStoredSettings = () => {
  if (typeof window === 'undefined') {
    return defaultFinanceSettings;
  }

  const readSettingsValue = (value: string | null) => {
    if (!value) {
      return undefined;
    }

    try {
      return normalizeFinanceSettings(JSON.parse(value));
    } catch {
      return undefined;
    }
  };

  const value = window.localStorage.getItem(settingsStorageKey.current);
  const settings = readSettingsValue(value);

  if (settings !== undefined) {
    return settings;
  }

  for (const legacyKey of settingsStorageKey.legacy) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    const legacySettings = readSettingsValue(legacyValue);

    if (legacySettings !== undefined && legacyValue) {
      window.localStorage.setItem(settingsStorageKey.current, legacyValue);

      return legacySettings;
    }
  }

  return defaultFinanceSettings;
};

const writeStoredSettings = (settings: FinanceSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    settingsStorageKey.current,
    JSON.stringify(settings),
  );
};

export const FinanceSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] = useState(defaultFinanceSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(readStoredSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    writeStoredSettings(settings);
  }, [hydrated, settings]);

  const addCategory = useCallback((category: string) => {
    const trimmed = category.trim();

    if (!trimmed || trimmed === uncategorizedCategory) {
      return;
    }

    setSettings((current) => {
      const currentCategories = current.categories.filter(
        (item) => item !== uncategorizedCategory,
      );
      const exists = currentCategories.some(
        (item) => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      );

      if (exists) {
        return current;
      }

      const categories = normalizeCategories([
        ...currentCategories,
        trimmed,
        uncategorizedCategory,
      ]);
      const categoryIndex = categories.findIndex((item) => item === trimmed);

      return {
        ...current,
        categories,
        categoryColors: normalizeCategoryColors(
          {
            ...current.categoryColors,
            [trimmed]: getDefaultCategoryColor(trimmed, categoryIndex),
          },
          categories,
        ),
      };
    });
  }, []);

  const deleteCategory = useCallback((category: string) => {
    if (category === uncategorizedCategory) {
      return;
    }

    setSettings((current) => {
      const categories = normalizeCategories(
        current.categories.filter((item) => item !== category),
      );

      return {
        ...current,
        categories,
        categoryColors: normalizeCategoryColors(
          current.categoryColors,
          categories,
        ),
      };
    });
  }, []);

  const resetCategories = useCallback(() => {
    setSettings((current) => ({
      ...current,
      categories: defaultFinanceSettings.categories,
      categoryColors: defaultFinanceSettings.categoryColors,
    }));
  }, []);

  const saveOllamaSettings = useCallback(
    ({ ollamaEndpoint, ollamaModel }: OllamaSettingsInput) => {
      setSettings((current) => ({
        ...current,
        ollamaEndpoint: normalizeOllamaEndpoint(ollamaEndpoint),
        ollamaModel: normalizeOllamaModel(ollamaModel),
      }));
    },
    [],
  );

  const updateCategoryColor = useCallback((category: string, color: string) => {
    setSettings((current) => {
      if (!current.categories.includes(category)) {
        return current;
      }

      const categoryIndex = current.categories.findIndex(
        (item) => item === category,
      );

      return {
        ...current,
        categoryColors: normalizeCategoryColors(
          {
            ...current.categoryColors,
            [category]: normalizeCategoryColor(
              color,
              getCategoryColor(category, current.categoryColors, categoryIndex),
            ),
          },
          current.categories,
        ),
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      addCategory,
      deleteCategory,
      hydrated,
      resetCategories,
      saveOllamaSettings,
      updateCategoryColor,
    }),
    [
      addCategory,
      deleteCategory,
      hydrated,
      resetCategories,
      saveOllamaSettings,
      settings,
      updateCategoryColor,
    ],
  );

  return (
    <FinanceSettingsContext.Provider value={value}>
      {children}
    </FinanceSettingsContext.Provider>
  );
};

export const useFinanceSettings = () => {
  const context = useContext(FinanceSettingsContext);

  if (!context) {
    throw new Error(
      'useFinanceSettings must be used within FinanceSettingsProvider.',
    );
  }

  return context;
};
