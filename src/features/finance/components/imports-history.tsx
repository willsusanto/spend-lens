'use client';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { useFinanceData } from '@/features/finance/use-finance-data';

export const ImportsHistory = () => {
  const { imports, message } = useFinanceData();

  return (
    <FinanceAppShell>
      <PageContainer flow="grid" className="gap-8">
        <PageHeader
          title="Import Log"
          description="CSV files imported into the draft queue."
        />

        {message ? (
          <Panel as="p" className="px-4 py-3 text-sm">
            {message}
          </Panel>
        ) : null}

        <Panel clipped>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-[hsl(var(--surface-low))] text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Imported At</th>
                  <th className="px-4 py-3">Rows Processed</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--outline-variant))]">
                {imports.length > 0 ? (
                  imports.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[hsl(var(--surface-low))]"
                    >
                      <td className="p-4 font-medium">{item.fileName}</td>
                      <td className="p-4 text-[hsl(var(--on-surface-variant))]">
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
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-[hsl(var(--on-surface-variant))]"
                    >
                      No CSV imports logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};
