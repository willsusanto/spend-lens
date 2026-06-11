import { TransactionDetail } from '@/features/finance/components/transaction-detail';

const TransactionDetailPage = ({
  params,
}: {
  params: { transactionId: string };
}) => {
  return <TransactionDetail transactionId={params.transactionId} />;
};

export default TransactionDetailPage;
