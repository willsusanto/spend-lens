'use client';

import { Check, FileText, Loader2, Upload } from 'lucide-react';
import { DragEvent, useEffect, useRef, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import {
  CategorySelect,
  DeleteRowButton,
  SignedAmount,
  TablePaginationFooter,
  TransactionStatusBadge,
} from '@/features/finance/components/transaction-table-parts';
import { pageSizeOptions } from '@/features/finance/data';
import {
  isDuplicateTransaction,
  isSaveableTransaction,
} from '@/features/finance/duplicate-transactions';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { useFinanceSettings } from '@/features/finance/use-finance-settings';
import { cn } from '@/utils/cn';

export const HomeDashboard = () => {
  const {
    activeImport,
    confirmImport,
    deleteStagedTransactions,
    draftStagedTransactionCategories,
    importCsv,
    imports,
    message,
    stagedTransactions,
    updateStagedTransactionCategory,
  } = useFinanceData();
  const { categories } = useFinanceSettings();
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
  const stagedRowsForActiveImport = activeImport.activeImportId
    ? stagedTransactions.filter(
        (transaction) => transaction.importId === activeImport.activeImportId,
      )
    : [];
  const stagedRowIdsForActiveImport = new Set(
    stagedRowsForActiveImport.map((transaction) => transaction.id),
  );
  const duplicateRows = processedRows.filter(isDuplicateTransaction);
  const saveableRows = processedRows.filter(isSaveableTransaction);
  const confirmRowsLabel = `Confirm ${saveableRows.length} ${
    saveableRows.length === 1 ? 'Row' : 'Rows'
  }`;
  const isResolvedActiveImport =
    activeImport.finalBatchStatus === 'Approved' ||
    (activeImport.finalBatchStatus === 'Duplicate' &&
      stagedRowsForActiveImport.length === 0);
  const processingMessage = activeImport.message ?? message;
  const hasUnsavedCategoryChanges = saveableRows.some(
    (transaction) => draftStagedTransactionCategories[transaction.id],
  );
  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const visibleRows = processedRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const allSaveableRowsCategorized =
    saveableRows.length > 0 &&
    saveableRows.every((transaction) => {
      const category =
        draftStagedTransactionCategories[transaction.id] ??
        transaction.category;

      return (
        category !== 'Uncategorized' &&
        transaction.status !== 'Review' &&
        transaction.confidence >= 70
      );
    });
  const canResolveImport =
    processedRows.length > 0 &&
    (saveableRows.length > 0
      ? allSaveableRowsCategorized
      : duplicateRows.length > 0);

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
              <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Processed transactions from the current CSV upload
                </caption>
                <thead className="bg-[hsl(var(--surface-low))]">
                  <tr className="border-b border-[hsl(var(--outline-variant))]">
                    {[
                      'Date',
                      'Description',
                      'Category',
                      'Amount',
                      'Status',
                      'Action',
                    ].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-relevant="additions">
                  {visibleRows.length > 0 ? (
                    visibleRows.map((transaction) => {
                      const isDuplicate = isDuplicateTransaction(transaction);
                      const canDelete =
                        stagedRowIdsForActiveImport.has(transaction.id) &&
                        !isImporting &&
                        !isResolvedActiveImport;
                      const category =
                        draftStagedTransactionCategories[transaction.id] ??
                        transaction.category;
                      const needsReview =
                        !isDuplicate &&
                        (category === 'Uncategorized' ||
                          transaction.status === 'Review' ||
                          transaction.confidence < 70);

                      return (
                        <tr
                          key={transaction.id}
                          className={cn(
                            'border-b border-[hsl(var(--outline-variant))] last:border-b-0',
                            isDuplicate &&
                              'bg-[hsl(var(--surface-low))] text-[hsl(var(--on-surface-variant))]',
                          )}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-[hsl(var(--on-surface-variant))]">
                            {transaction.date}
                          </td>
                          <th scope="row" className="px-4 py-3 font-medium">
                            {transaction.description}
                          </th>
                          <td className="px-4 py-3">
                            {isDuplicate ? (
                              <span className="inline-flex min-h-9 items-center rounded bg-[hsl(var(--surface-high))] px-2 text-xs font-medium">
                                Duplicate
                              </span>
                            ) : (
                              <CategorySelect
                                ariaLabel={`Category for ${transaction.description}`}
                                categories={categories}
                                hasDraft={Boolean(
                                  draftStagedTransactionCategories[
                                    transaction.id
                                  ],
                                )}
                                isInvalid={category === 'Uncategorized'}
                                value={category}
                                onChange={(value) =>
                                  updateDraftCategory(transaction.id, value)
                                }
                              />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <SignedAmount amount={transaction.amount} />
                          </td>
                          <td className="px-4 py-3">
                            <TransactionStatusBadge
                              state={
                                isDuplicate
                                  ? 'duplicate'
                                  : needsReview
                                    ? 'needs-review'
                                    : 'ready'
                              }
                              text={
                                isDuplicate
                                  ? 'Duplicate'
                                  : needsReview
                                    ? 'Needs review'
                                    : 'Ready'
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            {canDelete ? (
                              <DeleteRowButton
                                onClick={() =>
                                  deleteStagedTransactions([transaction.id])
                                }
                              >
                                Delete
                              </DeleteRowButton>
                            ) : null}
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
            <TablePaginationFooter
              className="bg-[hsl(var(--surface-low))] backdrop-blur-none"
              itemLabel="processed rows"
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              totalCount={processedRows.length}
              visibleCount={visibleRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm font-medium">
              {activeImport.finalBatchStatus === 'Approved' ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  Saved
                </span>
              ) : activeImport.finalBatchStatus === 'Duplicate' ? (
                'Duplicates skipped'
              ) : latestImport ? (
                `${saveableRows.length} rows ready to save${
                  duplicateRows.length > 0
                    ? `, ${duplicateRows.length} duplicate`
                    : ''
                }`
              ) : processedRows.length > 0 ? (
                `${processedRows.length} rows processed so far${
                  duplicateRows.length > 0
                    ? `, ${duplicateRows.length} duplicate`
                    : ''
                }`
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
                isResolvedActiveImport ||
                !canResolveImport ||
                hasUnsavedCategoryChanges
              }
              onClick={saveLatestImport}
            >
              <Check className="size-4" aria-hidden="true" />
              {confirmRowsLabel}
            </button>
          </div>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};
