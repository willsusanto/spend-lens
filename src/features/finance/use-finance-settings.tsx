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
  normalizeCategories,
  normalizeFinanceSettings,
  normalizeOllamaEndpoint,
  normalizeOllamaModel,
  uncategorizedCategory,
} from '@/features/finance/finance-settings';

const settingsStorageKey = 'ledgerlocal.settings';

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
};

const FinanceSettingsContext =
  createContext<FinanceSettingsContextValue | null>(null);

const readStoredSettings = () => {
  if (typeof window === 'undefined') {
    return defaultFinanceSettings;
  }

  const value = window.localStorage.getItem(settingsStorageKey);

  if (!value) {
    return defaultFinanceSettings;
  }

  try {
    return normalizeFinanceSettings(JSON.parse(value));
  } catch {
    return defaultFinanceSettings;
  }
};

const writeStoredSettings = (settings: FinanceSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
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

      return {
        ...current,
        categories: normalizeCategories([
          ...currentCategories,
          trimmed,
          uncategorizedCategory,
        ]),
      };
    });
  }, []);

  const deleteCategory = useCallback((category: string) => {
    if (category === uncategorizedCategory) {
      return;
    }

    setSettings((current) => ({
      ...current,
      categories: normalizeCategories(
        current.categories.filter((item) => item !== category),
      ),
    }));
  }, []);

  const resetCategories = useCallback(() => {
    setSettings((current) => ({
      ...current,
      categories: defaultFinanceSettings.categories,
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

  const value = useMemo(
    () => ({
      ...settings,
      addCategory,
      deleteCategory,
      hydrated,
      resetCategories,
      saveOllamaSettings,
    }),
    [
      addCategory,
      deleteCategory,
      hydrated,
      resetCategories,
      saveOllamaSettings,
      settings,
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
