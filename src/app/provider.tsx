'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { MainErrorFallback } from '@/components/errors/main';
import { Notifications } from '@/components/ui/notifications';
import { getDefaultFinanceStore } from '@/features/finance/finance-store';
import { FinanceDataProvider } from '@/features/finance/use-finance-data';
import { FinanceSettingsProvider } from '@/features/finance/use-finance-settings';
import { queryConfig } from '@/lib/react-query';

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      }),
  );
  const [financeStore] = React.useState(() => getDefaultFinanceStore());

  return (
    <ErrorBoundary FallbackComponent={MainErrorFallback}>
      <QueryClientProvider client={queryClient}>
        {process.env.DEV && <ReactQueryDevtools />}
        <Notifications />
        <FinanceSettingsProvider>
          <FinanceDataProvider store={financeStore}>
            {children}
          </FinanceDataProvider>
        </FinanceSettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
