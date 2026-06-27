'use client';

import { Eye, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

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
  getDataTableActionClassName,
} from '@/components/ui/table';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { TransactionStatusBadge } from '@/features/finance/components/transaction-table-parts';
import { FinanceStatus } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';

const importsHistoryColumns = [
  { key: 'file-name', label: 'File Name' },
  { key: 'date', label: 'Date' },
  { key: 'rows', label: 'Rows' },
  { key: 'status', label: 'Status' },
  { align: 'center' as const, key: 'action', label: 'Action' },
];

const getImportStatusState = (status: FinanceStatus) => {
  if (status === 'Approved') {
    return 'approved';
  }

  if (status === 'Duplicate') {
    return 'duplicate';
  }

  return 'needs-review';
};

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
          <DataTable caption="Import history" minWidthClassName="min-w-[40rem]">
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHeaderCells columns={importsHistoryColumns} />
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {imports.length > 0 ? (
                imports.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableRowHeader>{item.fileName}</DataTableRowHeader>
                    <DataTableCell muted>{item.date}</DataTableCell>
                    <DataTableCell>
                      {item.rows}
                      {item.duplicateRows ? (
                        <span className="ml-2 text-xs text-[hsl(var(--on-surface-variant))]">
                          {item.duplicateRows} duplicate
                        </span>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell>
                      <TransactionStatusBadge
                        state={getImportStatusState(item.status)}
                        text={item.status}
                      />
                    </DataTableCell>
                    <DataTableCell align="center" className="w-16">
                      <Link
                        aria-label={`Review ${item.fileName}`}
                        href={`/imports/${item.id}/review`}
                        className={getDataTableActionClassName()}
                        title={`Review ${item.fileName}`}
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                      </Link>
                    </DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <DataTableEmptyRow colSpan={5}>
                  No imports yet. Upload a CSV to start categorizing rows.
                </DataTableEmptyRow>
              )}
            </DataTableBody>
          </DataTable>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};
