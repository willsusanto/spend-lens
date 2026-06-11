import { ImportReview } from '@/features/finance/components/import-review';

const ImportReviewPage = ({ params }: { params: { importId: string } }) => {
  return <ImportReview importId={params.importId} />;
};

export default ImportReviewPage;
