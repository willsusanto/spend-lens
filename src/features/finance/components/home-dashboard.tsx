'use client';

import { Check, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHeader,
  DataTableHeaderCells,
  DataTableHeaderRow,
  DataTableRow,
  DataTableRowHeader,
} from '@/components/ui/table';
import { CsvUploadDropzone } from '@/features/finance/components/csv-upload-control';
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

const dashboardTransactionColumns = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { align: 'right' as const, key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { align: 'center' as const, key: 'action', label: 'Action' },
];

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof pageSizeOptions)[number]>(10);
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
  const hasConfirmedActiveImport =
    activeImport.finalBatchStatus === 'Approved' ||
    activeImport.finalBatchStatus === 'Duplicate';
  const emptyProcessedRowsMessage = hasConfirmedActiveImport
    ? 'Import confirmed. Staged rows were cleared from this table.'
    : 'No processed rows yet.';
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

        <CsvUploadDropzone
          disabled={isImporting}
          onFilesSelected={handleFiles}
        />

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
                  : hasConfirmedActiveImport && activeImport.fileName
                    ? `${activeImport.fileName} confirmed`
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
            <DataTable
              caption="Processed transactions from the current CSV upload"
              minWidthClassName="min-w-[48rem]"
            >
              <DataTableHeader>
                <DataTableHeaderRow>
                  <DataTableHeaderCells columns={dashboardTransactionColumns} />
                </DataTableHeaderRow>
              </DataTableHeader>
              <DataTableBody aria-live="polite" aria-relevant="additions">
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
                      <DataTableRow
                        key={transaction.id}
                        tone={isDuplicate ? 'muted' : 'default'}
                      >
                        <DataTableCell muted noWrap>
                          {transaction.date}
                        </DataTableCell>
                        <DataTableRowHeader>
                          {transaction.description}
                        </DataTableRowHeader>
                        <DataTableCell>
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
                        </DataTableCell>
                        <DataTableCell align="right" noWrap>
                          <SignedAmount amount={transaction.amount} />
                        </DataTableCell>
                        <DataTableCell>
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
                        </DataTableCell>
                        <DataTableCell align="center" className="w-16">
                          {canDelete ? (
                            <DeleteRowButton
                              iconOnly
                              onClick={() =>
                                deleteStagedTransactions([transaction.id])
                              }
                              srLabel={`Delete ${transaction.description}`}
                            />
                          ) : null}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })
                ) : (
                  <DataTableEmptyRow colSpan={6}>
                    {emptyProcessedRowsMessage}
                  </DataTableEmptyRow>
                )}
              </DataTableBody>
            </DataTable>
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
                  Confirmed and saved to Transactions
                </span>
              ) : activeImport.finalBatchStatus === 'Duplicate' ? (
                'Confirmed. Duplicate rows skipped.'
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
