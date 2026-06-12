import { ReactNode } from 'react';

import { Panel } from '@/components/ui/panel';

type MetricCardProps = {
  adornment?: ReactNode;
  helper: ReactNode;
  label: ReactNode;
  unit?: ReactNode;
  value: ReactNode;
};

export const MetricCard = ({
  adornment,
  helper,
  label,
  unit,
  value,
}: MetricCardProps) => {
  return (
    <Panel as="article" className="relative p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[hsl(var(--on-surface-variant))]">
        {label}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-2xl font-semibold leading-8">{value}</p>
        {unit ? (
          <span className="rounded bg-[hsl(var(--surface-highest))] px-2 py-1 text-[0.8125rem] leading-5">
            {unit}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-[hsl(var(--outline))]">{helper}</p>
      {adornment}
    </Panel>
  );
};
