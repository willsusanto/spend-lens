import { CheckCircle2, Layers3, WalletCards } from 'lucide-react';

import { formatSignedCurrency } from '@/features/finance/data';
import { cn } from '@/utils/cn';

type TransactionsReviewMetricsProps = {
  expenseCount: number;
  filteredCount: number;
  selectedCount: number;
  totalBalance: number;
};

const getQuickMetricTone = (index: number) =>
  [
    'from-zinc-950 to-zinc-700 text-white dark:from-stone-100 dark:to-stone-300 dark:text-zinc-950',
    'from-emerald-500 to-teal-600 text-white',
    'from-amber-400 to-orange-500 text-zinc-950',
  ][index];

export const TransactionsReviewMetrics = ({
  expenseCount,
  filteredCount,
  selectedCount,
  totalBalance,
}: TransactionsReviewMetricsProps) => {
  const metrics = [
    {
      helper: `${filteredCount} matching rows`,
      icon: WalletCards,
      label: 'Filtered balance',
      value: formatSignedCurrency(totalBalance),
    },
    {
      helper: 'Ready for review or export',
      icon: Layers3,
      label: 'Expense rows',
      value: String(expenseCount),
    },
    {
      helper: 'Bulk actions stay one tap away',
      icon: CheckCircle2,
      label: 'Selected rows',
      value: String(selectedCount),
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className={cn(
              'animate-enter overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-[0_18px_50px_hsl(var(--foreground)/0.10)]',
              getQuickMetricTone(index),
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium opacity-80">{metric.label}</p>
              <span className="grid size-10 place-items-center rounded-full bg-white/20 text-current backdrop-blur">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              {metric.value}
            </p>
            <p className="mt-1 text-sm opacity-75">{metric.helper}</p>
          </div>
        );
      })}
    </section>
  );
};
