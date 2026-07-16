import { notFound } from 'next/navigation';

import { ImportsHistory } from '@/features/finance/components/imports-history';

const ImportsPage = () => {
  if (process.env.NEXT_PUBLIC_HOSTED_MODE === 'true') {
    notFound();
  }

  return <ImportsHistory />;
};

export default ImportsPage;
