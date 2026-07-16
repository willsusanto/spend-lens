'use client';

import { HomeDashboard } from '@/features/finance/components/home-dashboard';
import { TransactionsReview } from '@/features/finance/components/transactions-review';

const HomePage = () => {
  if (process.env.NEXT_PUBLIC_HOSTED_MODE === 'true') {
    return <TransactionsReview />;
  }

  return <HomeDashboard />;
};

export default HomePage;
