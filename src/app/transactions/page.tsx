import { redirect } from 'next/navigation';

import { TransactionsReview } from '@/features/finance/components/transactions-review';

const TransactionsPage = () => {
  if (process.env.NEXT_PUBLIC_HOSTED_MODE === 'true') {
    redirect('/');
  }

  return <TransactionsReview />;
};

export default TransactionsPage;
