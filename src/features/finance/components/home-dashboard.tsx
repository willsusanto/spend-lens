'use client';

import { AlertCircle, FileText, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DragEvent, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { MetricCard } from '@/features/finance/components/metric-card';
import {
  formatCurrency,
  spendingByCategory as fallbackSpending,
} from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

const buildCategorySpending = (
  transactions: ReturnType<typeof useFinanceData>['transactions'],
) => {
  const totals = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    }, {});

  const entries = Object.entries(totals)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5);

  if (!entries.length) {
    return fallbackSpending;
  }

  const max = Math.max(...entries.map(([, total]) => total));

  return entries.map(([name, total], index) => ({
    name,
    amount: formatCurrency(total),
    percent: Math.max(8, Math.round((total / max) * 100)),
    tone:
      [
        'bg-primary',
        'bg-[hsl(var(--surface-tint))]',
        'bg-[hsl(var(--outline))]',
        'bg-[hsl(var(--outline-variant))]',
        'bg-secondary-foreground',
      ][index] ?? 'bg-primary',
  }));
};

export const HomeDashboard = () => {
  const { imports, importCsv, message, stats, transactions } = useFinanceData();
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const categorySpending = useMemo(
    () => buildCategorySpending(transactions),
    [transactions],
  );

  const metrics = [
    {
      label: 'Total Spending',
      value: formatCurrency(stats.spending),
      helper: 'Imported transactions',
    },
    {
      label: 'Total Income',
      value: formatCurrency(stats.income),
      helper: 'Deposits and credits',
    },
    {
      label: 'Needs Review',
      value: String(stats.needsReview),
      unit: 'Items',
      helper: 'Low-confidence imports',
    },
  ];

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await importCsv(file);
      router.push(`/imports/${result.batch.id}/review`);
    } finally {
      setIsImporting(false);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  return (
    <AppShell>
      <PageContainer flow="grid" className="gap-8">
        <PageHeader
          title="Weekly Summary"
          description="Oct 16 - Oct 22, 2023"
          actions={
            <Link
              href="/transactions"
              className="inline-flex min-h-10 items-center justify-center self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 md:self-auto"
            >
              Go to Transactions
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-12">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                unit={metric.unit}
                helper={metric.helper}
                adornment={
                  metric.unit ? (
                    <AlertCircle
                      className="absolute right-4 top-4 size-9 text-[hsl(var(--outline-variant))]"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  ) : null
                }
              />
            ))}
          </section>

          <section className="flex flex-col gap-4 lg:col-span-8">
            <label
              className={cn(
                'group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] p-8 text-center transition-colors hover:bg-[hsl(var(--surface-low))]',
                isDragging && 'border-primary bg-[hsl(var(--surface-low))]',
              )}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                disabled={isImporting}
                onChange={(event) => handleFiles(event.target.files)}
              />
              <span className="mb-4 grid size-[4.5rem] place-items-center rounded-xl bg-[hsl(var(--surface-high))] transition-transform duration-300 group-hover:scale-105">
                <Upload className="size-8" aria-hidden="true" />
              </span>
              <span className="text-xl font-semibold leading-7">
                {isImporting ? 'Categorizing with Ollama' : 'Upload CSV'}
              </span>
              <span className="mt-2 max-w-md text-pretty text-sm leading-5 text-[hsl(var(--on-surface-variant))]">
                {isImporting
                  ? 'Keep this page open. You will be redirected to review when categorization finishes or times out.'
                  : 'Drag and drop your bank export files here, or click to browse. Supported format: .csv'}
              </span>
              {message ? (
                <span className="mt-4 rounded bg-[hsl(var(--surface-highest))] px-3 py-1 text-xs font-medium">
                  {message}
                </span>
              ) : null}
            </label>

            <Panel as="article">
              <PanelHeader className="flex items-center justify-between bg-[hsl(var(--surface-low))] px-4 py-3">
                <h2 className="text-sm font-semibold">Recent Imports</h2>
                <Link
                  href="/imports"
                  className="text-xs text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  View All
                </Link>
              </PanelHeader>
              <div className="min-w-0">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))]">
                      <th className="w-[42%] px-4 py-3 text-left text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                        File Name
                      </th>
                      <th className="w-[28%] px-4 py-3 text-left text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                        Date
                      </th>
                      <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                        Rows
                      </th>
                      <th className="w-[18%] px-4 py-3 text-left text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {imports.slice(0, 3).map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          'transition-colors hover:bg-[hsl(var(--surface-low))]',
                          index < Math.min(imports.length, 3) - 1 &&
                            'border-b border-[hsl(var(--outline-variant))]',
                        )}
                      >
                        <td className="p-4">
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText
                              className="size-4 shrink-0 text-[hsl(var(--outline))]"
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.fileName}</span>
                          </span>
                        </td>
                        <td className="truncate p-4 text-[hsl(var(--on-surface-variant))]">
                          {item.date}
                        </td>
                        <td className="p-4">{item.rows}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2 rounded bg-[hsl(var(--surface-highest))] px-2 py-1 text-xs font-medium">
                            <span className="size-2 rounded-full bg-primary" />
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <Panel as="aside" className="p-4 lg:col-span-4">
            <h2 className="text-sm font-semibold">Spending by Category</h2>
            <div
              className="flex min-h-80 flex-col justify-center gap-5 lg:min-h-[22rem]"
              aria-hidden="true"
            >
              {categorySpending.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-[hsl(var(--on-surface-variant))]">
                      {category.amount}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[hsl(var(--surface-highest))]">
                    <div
                      className={cn('h-full rounded-full', category.tone)}
                      style={{ inlineSize: `${category.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>Spending by category</caption>
              <tbody>
                {categorySpending.map((category) => (
                  <tr key={category.name}>
                    <th scope="row">{category.name}</th>
                    <td>{category.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </PageContainer>
    </AppShell>
  );
};
