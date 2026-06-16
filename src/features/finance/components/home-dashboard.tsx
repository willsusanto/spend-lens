'use client';

import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { categories, formatSignedCurrency } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { cn } from '@/utils/cn';

const pageSizeOptions = [10, 30, 60] as const;
type HomeSortKey = 'amount' | 'category' | 'date' | 'description' | 'status';
type SortDirection = 'asc' | 'desc';

const getTimestamp = (date: string) => {
  const parsed = new Date(date).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const getDraftStatusLabel = (input: {
  category: string;
  confidence: number;
  isDuplicate?: boolean;
  status: string;
}) => {
  if (input.isDuplicate) {
    return 'Duplicate';
  }

  if (
    input.category === 'Uncategorized' ||
    input.status === 'Review' ||
    input.confidence < 70
  ) {
    return 'Needs review';
  }

  return 'Ready';
};

export const HomeDashboard = () => {
  const {
    activeImport,
    confirmStagedImports,
    deleteStagedTransactions,
    draftStagedTransactionCategories,
    importCsv,
    message,
    stagedTransactions,
    updateStagedTransactionCategory,
  } = useFinanceData();
  const [isDragging, setIsDragging] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof pageSizeOptions)[number]>(10);
  const [sortKey, setSortKey] = useState<HomeSortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImporting = activeImport.isProcessing;
  const processedRows = stagedTransactions;
  const processingMessage = activeImport.message ?? message;
  const duplicateTransactions = processedRows.filter(
    (transaction) => transaction.isDuplicate,
  );
  const saveableRowCount = processedRows.filter(
    (transaction) => !transaction.isDuplicate,
  ).length;
  const duplicateTransactionIds = duplicateTransactions.map(
    (transaction) => transaction.id,
  );
  const hasUnsavedCategoryChanges = processedRows.some(
    (transaction) => draftStagedTransactionCategories[transaction.id],
  );
  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const sortedRows = useMemo(
    () =>
      processedRows.toSorted((left, right) => {
        const leftCategory =
          draftStagedTransactionCategories[left.id] ?? left.category;
        const rightCategory =
          draftStagedTransactionCategories[right.id] ?? right.category;
        const direction = sortDirection === 'asc' ? 1 : -1;

        if (sortKey === 'amount') {
          return (left.amount - right.amount) * direction;
        }

        if (sortKey === 'category') {
          return leftCategory.localeCompare(rightCategory) * direction;
        }

        if (sortKey === 'description') {
          return left.description.localeCompare(right.description) * direction;
        }

        if (sortKey === 'status') {
          return (
            getDraftStatusLabel({
              category: leftCategory,
              confidence: left.confidence,
              isDuplicate: left.isDuplicate,
              status: left.status,
            }).localeCompare(
              getDraftStatusLabel({
                category: rightCategory,
                confidence: right.confidence,
                isDuplicate: right.isDuplicate,
                status: right.status,
              }),
            ) * direction
          );
        }

        return (getTimestamp(left.date) - getTimestamp(right.date)) * direction;
      }),
    [draftStagedTransactionCategories, processedRows, sortDirection, sortKey],
  );
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const visibleRowIds = visibleRows.map((transaction) => transaction.id);
  const selectedVisibleIds = visibleRowIds.filter((id) =>
    selectedTransactionIds.includes(id),
  );
  const allVisibleSelected =
    visibleRowIds.length > 0 &&
    selectedVisibleIds.length === visibleRowIds.length;
  const allRowsCategorized =
    processedRows.length > 0 &&
    processedRows
      .filter((transaction) => !transaction.isDuplicate)
      .every((transaction) => {
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

  useEffect(() => {
    const processedRowIds = new Set(processedRows.map((row) => row.id));

    setSelectedTransactionIds((current) =>
      current.filter((id) => processedRowIds.has(id)),
    );
  }, [processedRows]);

  const updateDraftCategory = (id: string, category: string) => {
    updateStagedTransactionCategory(id, category);
  };

  const updateSort = (nextSortKey: HomeSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));

      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === 'date' ? 'desc' : 'asc');
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

  const saveDraftImports = () => {
    confirmStagedImports();
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactionIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedTransactionIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleRowIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleRowIds]));
    });
  };

  const excludeSelectedTransactions = () => {
    deleteStagedTransactions(selectedTransactionIds);
    setSelectedTransactionIds([]);
  };

  const excludeDuplicateTransactions = () => {
    deleteStagedTransactions(duplicateTransactionIds);
    setSelectedTransactionIds((current) =>
      current.filter((id) => !duplicateTransactionIds.includes(id)),
    );
    setDuplicateDialogOpen(false);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Processing</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                disabled={
                  selectedTransactionIds.length === 0 ||
                  activeImport.isProcessing
                }
                onClick={excludeSelectedTransactions}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Exclude Selected
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                disabled={
                  duplicateTransactionIds.length === 0 ||
                  activeImport.isProcessing
                }
                onClick={() => setDuplicateDialogOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Exclude Duplicates
              </button>
              <Link
                href="/imports"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
              >
                <History className="size-4" aria-hidden="true" />
                Import Log
              </Link>
            </div>
          </div>
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
                  : processedRows.length > 0
                    ? `${processedRows.length} draft rows waiting`
                    : 'Waiting for a CSV upload'}
              </p>
              <p className="mt-1 text-sm leading-5 text-[hsl(var(--on-surface-variant))]">
                {processingMessage ??
                  'The processing result will appear here after you upload a file.'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 py-3 text-xs text-[hsl(var(--on-surface-variant))] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {visibleRows.length} of {processedRows.length} draft rows
              {selectedTransactionIds.length > 0
                ? ` - ${selectedTransactionIds.length} selected`
                : ''}
            </span>
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
          </div>

          <div className="overflow-clip rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Processed transactions from the current CSV upload
                </caption>
                <thead className="bg-[hsl(var(--surface-low))]">
                  <tr className="border-b border-[hsl(var(--outline-variant))]">
                    <th scope="col" className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-[hsl(var(--outline-variant))]"
                        aria-label="Select visible imported rows"
                        checked={allVisibleSelected}
                        onChange={toggleVisibleSelection}
                      />
                    </th>
                    {[
                      { key: 'date' as const, label: 'Date' },
                      { key: 'description' as const, label: 'Description' },
                      { key: 'category' as const, label: 'Category' },
                      { key: 'amount' as const, label: 'Amount' },
                      { key: 'status' as const, label: 'Status' },
                    ].map((header) => (
                      <th
                        key={header.key}
                        scope="col"
                        className="px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                      >
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1.5 text-left uppercase tracking-[0.08em] transition-colors hover:text-[hsl(var(--foreground))]',
                            sortKey === header.key &&
                              'text-[hsl(var(--foreground))]',
                            header.key === 'amount' && 'ml-auto',
                          )}
                          onClick={() => updateSort(header.key)}
                        >
                          {header.label}
                          <ArrowUpDown
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          <span className="sr-only">
                            Sort {header.label}{' '}
                            {sortKey === header.key
                              ? sortDirection === 'asc'
                                ? 'descending'
                                : 'ascending'
                              : 'ascending'}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-relevant="additions">
                  {visibleRows.length > 0 ? (
                    visibleRows.map((transaction) => {
                      const category =
                        draftStagedTransactionCategories[transaction.id] ??
                        transaction.category;
                      const needsReview =
                        !transaction.isDuplicate &&
                        (category === 'Uncategorized' ||
                          transaction.status === 'Review' ||
                          transaction.confidence < 70);

                      return (
                        <tr
                          key={transaction.id}
                          className="border-b border-[hsl(var(--outline-variant))] last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-[hsl(var(--outline-variant))]"
                              aria-label={`Select ${transaction.description}`}
                              checked={selectedTransactionIds.includes(
                                transaction.id,
                              )}
                              onChange={() =>
                                toggleTransactionSelection(transaction.id)
                              }
                            />
                          </td>
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
                                disabled={transaction.isDuplicate}
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
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded bg-[hsl(var(--surface-highest))] px-2 py-1 text-xs font-medium',
                                transaction.isDuplicate &&
                                  'bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100',
                                needsReview &&
                                  'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100',
                              )}
                            >
                              {transaction.isDuplicate
                                ? 'Duplicate'
                                : needsReview
                                  ? 'Needs review'
                                  : 'Ready'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-[hsl(var(--on-surface-variant))]"
                      >
                        No processed rows yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-col gap-3 border-t border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-4 py-3 text-xs text-[hsl(var(--on-surface-variant))] sm:flex-row sm:items-center sm:justify-end">
              <div className="flex flex-wrap items-center gap-2">
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
              ) : processedRows.length > 0 ? (
                `${saveableRowCount} ${saveableRowCount === 1 ? 'row' : 'rows'} will be saved to Transactions`
              ) : (
                'No processed import yet'
              )}
            </p>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              disabled={
                processedRows.length === 0 ||
                isImporting ||
                activeImport.finalBatchStatus === 'Approved' ||
                !allRowsCategorized ||
                hasUnsavedCategoryChanges
              }
              onClick={saveDraftImports}
            >
              <Check className="size-4" aria-hidden="true" />
              Confirm Save {saveableRowCount}{' '}
              {saveableRowCount === 1 ? 'Row' : 'Rows'}
            </button>
          </div>
        </Panel>

        <Dialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
        >
          <DialogContent className="max-w-3xl rounded border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
            <DialogHeader>
              <DialogTitle>Exclude Duplicate Rows</DialogTitle>
              <DialogDescription>
                {duplicateTransactions.length} duplicate{' '}
                {duplicateTransactions.length === 1 ? 'row' : 'rows'} will be
                removed from the draft import table.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-80 overflow-auto border border-[hsl(var(--outline-variant))]">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="sticky top-0 bg-[hsl(var(--surface-low))] text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--outline-variant))]">
                  {duplicateTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-[hsl(var(--on-surface-variant))]">
                        {transaction.date}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {transaction.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-semibold">
                        {formatSignedCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <button
                  type="button"
                  className="min-h-10 rounded border border-[hsl(var(--outline-variant))] px-4 text-sm font-medium"
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-destructive px-4 text-sm font-semibold text-destructive-foreground"
                onClick={excludeDuplicateTransactions}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Yes, Exclude Duplicates
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </FinanceAppShell>
  );
};
