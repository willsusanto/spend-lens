import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  FinanceSettingsProvider,
  useFinanceSettings,
} from '@/features/finance/use-finance-settings';

const createWrapper = () => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FinanceSettingsProvider>{children}</FinanceSettingsProvider>
  );

  return Wrapper;
};

describe('FinanceSettingsProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('loads legacy LedgerLocal settings into the SpendLens namespace', async () => {
    const settings = {
      categories: ['Income', 'Groceries', 'Uncategorized'],
      ollamaEndpoint: 'http://localhost:11434',
      ollamaModel: 'gemma4:12b',
    };

    window.localStorage.setItem(
      'ledgerlocal.settings',
      JSON.stringify(settings),
    );

    const { result } = renderHook(() => useFinanceSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.categories).toEqual(settings.categories);
    expect(result.current.ollamaEndpoint).toBe(settings.ollamaEndpoint);
    expect(result.current.ollamaModel).toBe(settings.ollamaModel);
    expect(window.localStorage.getItem('spendlens.settings')).toBe(
      JSON.stringify(settings),
    );
  });
});
