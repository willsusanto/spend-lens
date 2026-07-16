import { notFound } from 'next/navigation';

import { ImportReview } from '@/features/finance/components/import-review';

const ImportReviewPage = ({ params }: { params: { importId: string } }) => {
  if (process.env.NEXT_PUBLIC_HOSTED_MODE === 'true') {
    notFound();
  }

  return <ImportReview importId={params.importId} />;
};

export default ImportReviewPage;
