'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react';
import { DragEvent, useEffect, useRef, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import {
  categories,
  formatSignedCurrency,
  pageSizeOptions,
} from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

export const HomeDashboard = () => {
  const {
    activeImport,
    confirmImport,
    draftStagedTransactionCategories,
    importCsv,
    imports,
    message,
    updateStagedTransactionCategory,
  } = useFinanceData();
  const [isDragging, setIsDragging] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof pageSizeOptions)[number]>(10);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestImport = imports.find(
    (item) => item.id === activeImport.activeImportId,
  );
  const isImporting = activeImport.isProcessing;
  const processedRows = activeImport.processedTransactions;
  const processingMessage = activeImport.message ?? message;
  const hasUnsavedCategoryChanges = processedRows.some(
    (transaction) => draftStagedTransactionCategories[transaction.id],
  );
  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const visibleRows = processedRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const allRowsCategorized =
    processedRows.length > 0 &&
    processedRows.every((transaction) => {
      const category =
        draftStagedTransactionCategories[transaction.id] ??
        transaction.category;

      return (
        category !== 'Uncategorized' &&
        transaction.status !== 'Review' &&
        transaction.confidence >= 70
      );
    });

  useEffect(() => {
    setPage(1);
  }, [pageSize, processedRows.length]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const updateDraftCategory = (id: string, category: string) => {
    updateStagedTransactionCategory(id, category);
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file || activeImport.isProcessing) {
      return;
    }

    await importCsv(file);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const saveLatestImport = () => {
    if (!activeImport.activeImportId) {
      return;
    }

    confirmImport(activeImport.activeImportId);
  };

  return (
    <FinanceAppShell>
      <PageContainer flow="space" className="max-w-5xl pt-3 sm:pt-6">
        <PageHeader
          title="Home"
          description="Import a local CSV, categorize each row, then confirm the saved ledger entries."
        />

        <label
          className={cn(
            'group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-8 text-center transition-colors hover:bg-[hsl(var(--surface-low))]',
            isDragging &&
              'border-[hsl(var(--foreground))] bg-[hsl(var(--surface-low))]',
            isImporting && 'cursor-wait opacity-80',
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
          <span className="mb-5 grid size-16 place-items-center rounded bg-[hsl(var(--surface-high))]">
            <Upload className="size-8" aria-hidden="true" />
          </span>
          <span className="text-2xl font-bold leading-8">Upload CSV</span>
          <span className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--on-surface-variant))]">
            Drag a bank export here or click to browse. Supported format: .csv.
          </span>
        </label>

        <Panel className="p-5">
          <h2 className="text-xl font-semibold">Processing</h2>
          <div className="mt-4 flex items-start gap-3 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] p-4">
            {isImporting ? (
              <Loader2
                className="mt-0.5 size-5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <FileText className="mt-0.5 size-5" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isImporting
                  ? 'Processing CSV with Ollama'
                  : activeImport.isComplete && activeImport.fileName
                    ? `${activeImport.fileName} processed`
                    : 'Waiting for a CSV upload'}
              </p>
              <p className="mt-1 text-sm leading-5 text-[hsl(var(--on-surface-variant))]">
                {processingMessage ??
                  'The processing result will appear here after you upload a file.'}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-clip rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Processed transactions from the current CSV upload
                </caption>
                <thead className="bg-[hsl(var(--surface-low))]">
                  <tr className="border-b border-[hsl(var(--outline-variant))]">
                    {['Date', 'Description', 'Category', 'Amount'].map(
                      (header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-relevant="additions">
                  {visibleRows.length > 0 ? (
                    visibleRows.map((transaction) => {
                      const category =
                        draftStagedTransactionCategories[transaction.id] ??
                        transaction.category;

                      return (
                        <tr
                          key={transaction.id}
                          className="border-b border-[hsl(var(--outline-variant))] last:border-b-0"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                            {transaction.date}
                          </td>
                          <th scope="row" className="px-4 py-3 font-medium">
                            {transaction.description}
                          </th>
                          <td className="px-4 py-3">
                            <label>
                              <span className="sr-only">
                                Category for {transaction.description}
                              </span>
                              <select
                                className={cn(
                                  'min-h-9 w-44 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] px-2 text-xs font-medium',
                                  category === 'Uncategorized' &&
                                    'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
                                  draftStagedTransactionCategories[
                                    transaction.id
                                  ] &&
                                    'border-primary bg-[hsl(var(--surface-low))]',
                                )}
                                value={category}
                                onChange={(event) =>
                                  updateDraftCategory(
                                    transaction.id,
                                    event.target.value,
                                  )
                                }
                              >
                                {categories.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </td>
                          <td
                            className={cn(
                              'whitespace-nowrap px-4 py-3 text-right font-mono font-semibold',
                              transaction.amount > 0 &&
                                'text-emerald-700 dark:text-emerald-300',
                            )}
                          >
                            {formatSignedCurrency(transaction.amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-sm text-[hsl(var(--on-surface-variant))]"
                      >
                        No processed rows yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-col gap-3 border-t border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-4 py-3 text-xs text-[hsl(var(--on-surface-variant))] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {visibleRows.length} of {processedRows.length} processed
                rows
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  <span>Rows</span>
                  <select
                    className="min-h-8 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-2 text-xs"
                    value={pageSize}
                    onChange={(event) =>
                      setPageSize(
                        Number(
                          event.target.value,
                        ) as (typeof pageSizeOptions)[number],
                      )
                    }
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <span>
                  Page {page} of {pageCount}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))] disabled:opacity-40"
                    disabled={page === 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    <span className="sr-only">Previous processing page</span>
                  </button>
                  <button
                    type="button"
                    className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))] disabled:opacity-40"
                    disabled={page === pageCount}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                    <span className="sr-only">Next processing page</span>
                  </button>
                </div>
              </div>
            </footer>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm font-medium">
              {activeImport.finalBatchStatus === 'Approved' ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  Saved
                </span>
              ) : latestImport ? (
                `${latestImport.rows} rows ready to save`
              ) : processedRows.length > 0 ? (
                `${processedRows.length} rows processed so far`
              ) : (
                'No processed import yet'
              )}
            </p>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              disabled={
                !activeImport.activeImportId ||
                isImporting ||
                activeImport.finalBatchStatus === 'Approved' ||
                !allRowsCategorized ||
                hasUnsavedCategoryChanges
              }
              onClick={saveLatestImport}
            >
              <Check className="size-4" aria-hidden="true" />
              Confirm Saved
            </button>
          </div>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};
