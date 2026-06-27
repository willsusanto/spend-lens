import { ManualTransactionDialog } from '@/features/finance/components/manual-transaction-dialog';
import { rtlRender, screen, userEvent } from '@/testing/test-utils';

const renderManualTransactionDialog = () => {
  return rtlRender(
    <ManualTransactionDialog
      categories={['Groceries']}
      message={null}
      open
      onOpenChange={() => undefined}
      onSubmit={(event) => event.preventDefault()}
    />,
  );
};

test('keeps the manual amount field to currency characters', async () => {
  renderManualTransactionDialog();

  const amountInput = screen.getByLabelText('Amount');

  await userEvent.type(amountInput, 'abc12e3.456');

  expect(amountInput).toHaveValue('123.45');
});

test('normalizes decimal-only manual amounts', async () => {
  renderManualTransactionDialog();

  const amountInput = screen.getByLabelText('Amount');

  await userEvent.type(amountInput, '.5');

  expect(amountInput).toHaveValue('0.5');
});
