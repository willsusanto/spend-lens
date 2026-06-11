import {
  render as rtlRender,
  waitForElementToBeRemoved,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppProvider } from '@/app/provider';

export const waitForLoadingToFinish = () =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByTestId(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ],
    { timeout: 4000 },
  );

export const renderApp = async (
  ui: any,
  renderOptions: Record<string, any> = {},
) => {
  return {
    ...rtlRender(ui, {
      wrapper: AppProvider,
      ...renderOptions,
    }),
  };
};

export * from '@testing-library/react';
export { userEvent, rtlRender };
