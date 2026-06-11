'use client';

import { Upload } from 'lucide-react';
import { useRef } from 'react';

import { AppShell } from '@/components/layouts/app-shell';
import { useFinanceData } from '@/features/finance/use-finance-data';

export const ImportsHistory = () => {
  const { importCsv, imports, message } = useFinanceData();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    await importCsv(file);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[90rem] p-4 md:p-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-9">Imports</h1>
            <p className="mt-1 text-sm text-[hsl(var(--on-surface-variant))]">
              Uploaded CSV batches and categorization progress.
            </p>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:self-auto">
            <Upload className="size-4" aria-hidden="true" />
            Upload CSV
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
        </header>

        {message ? (
          <p className="mb-4 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 py-3 text-sm">
            {message}
          </p>
        ) : null}

        <section className="overflow-clip rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-[hsl(var(--surface-low))] text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--outline-variant))]">
                {imports.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[hsl(var(--surface-low))]"
                  >
                    <td className="px-4 py-4 font-medium">{item.fileName}</td>
                    <td className="px-4 py-4 text-[hsl(var(--on-surface-variant))]">
                      {item.date}
                    </td>
                    <td className="px-4 py-4">{item.rows}</td>
                    <td className="px-4 py-4">
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
        </section>
      </div>
    </AppShell>
  );
};
