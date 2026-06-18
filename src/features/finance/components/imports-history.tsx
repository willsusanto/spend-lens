'use client';

import { Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { FinanceStatus } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

const getStatusDotClassName = (status: FinanceStatus) =>
  status === 'Duplicate' ? 'bg-[hsl(var(--outline))]' : 'bg-primary';

export const ImportsHistory = () => {
  const { activeImport, importCsv, imports, message } = useFinanceData();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file || activeImport.isProcessing) {
      return;
    }

    const result = await importCsv(file);

    if (result) {
      router.push(`/imports/${result.batch.id}/review`);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <FinanceAppShell>
      <PageContainer flow="grid" className="gap-8">
        <PageHeader
          title="Imports"
          description="Uploaded CSV batches and categorization progress."
          actions={
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:self-auto">
              <Upload className="size-4" aria-hidden="true" />
              Upload CSV
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                disabled={activeImport.isProcessing}
                onChange={(event) => handleFiles(event.target.files)}
              />
            </label>
          }
        />

        {message ? (
          <Panel as="p" className="px-4 py-3 text-sm">
            {message}
          </Panel>
        ) : null}

        <Panel clipped>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-[hsl(var(--surface-low))] text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--outline-variant))]">
                {imports.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[hsl(var(--surface-low))]"
                  >
                    <td className="p-4 font-medium">{item.fileName}</td>
                    <td className="p-4 text-[hsl(var(--on-surface-variant))]">
                      {item.date}
                    </td>
                    <td className="p-4">
                      {item.rows}
                      {item.duplicateRows ? (
                        <span className="ml-2 text-xs text-[hsl(var(--on-surface-variant))]">
                          {item.duplicateRows} duplicate
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-2 rounded bg-[hsl(var(--surface-highest))] px-2 py-1 text-xs font-medium">
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            getStatusDotClassName(item.status),
                          )}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/imports/${item.id}/review`}
                        className="rounded border border-[hsl(var(--outline-variant))] px-2 py-1 text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};
