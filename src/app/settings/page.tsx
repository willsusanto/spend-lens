'use client';

import { Cable, Plus, Trash2, Wand2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import { categories as seedCategories } from '@/features/finance/data';
import { useFinanceData } from '@/features/finance/use-finance-data';

const getCategoryType = (category: string) =>
  category === 'Income' ? 'Income' : 'Expense';

const SettingsPage = () => {
  const { transactions } = useFinanceData();
  const [categories, setCategories] = useState(seedCategories);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(
    null,
  );
  const usedCategories = useMemo(
    () => new Set(transactions.map((transaction) => transaction.category)),
    [transactions],
  );

  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get('category')).trim();

    if (!name || categories.includes(name)) {
      return;
    }

    setCategories((current) => [...current, name]);
    event.currentTarget.reset();
  };

  const deleteCategory = (category: string) => {
    setCategories((current) => current.filter((item) => item !== category));
  };

  return (
    <FinanceAppShell>
      <PageContainer flow="space" className="max-w-5xl pt-3 sm:pt-6">
        <PageHeader
          title="Settings"
          description="Manage your local environment and transaction categories."
        />

        <Panel>
          <PanelHeader>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Wand2 className="size-5" aria-hidden="true" />
              AI Connection
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
              Configure your local LLM settings for auto-categorization of
              imported transactions.
            </p>
          </PanelHeader>
          <form className="grid gap-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Ollama Endpoint URL
                <input
                  className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                  defaultValue="http://localhost:11434"
                  type="url"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Model Name
                <input
                  className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                  defaultValue="llama3"
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <p
                aria-live="polite"
                className="text-sm text-[hsl(var(--on-surface-variant))] sm:mr-auto"
              >
                {connectionMessage}
              </p>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground"
                onClick={() =>
                  setConnectionMessage('Connection settings saved locally.')
                }
              >
                <Cable className="size-4" aria-hidden="true" />
                Test Connection
              </button>
            </div>
          </form>
        </Panel>

        <Panel clipped>
          <PanelHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Categories</h2>
              <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
                Manage labels for your financial data.
              </p>
            </div>
            <form className="flex gap-2" onSubmit={addCategory}>
              <label className="min-w-0">
                <span className="sr-only">New category name</span>
                <input
                  required
                  name="category"
                  className="min-h-10 min-w-0 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                  placeholder="New category..."
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-medium"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Category
              </button>
            </form>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <caption className="sr-only">Category settings</caption>
              <thead className="bg-[hsl(var(--surface-low))]">
                <tr className="border-y border-[hsl(var(--outline-variant))]">
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                  >
                    Category Name
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const isUsed = usedCategories.has(category);

                  return (
                    <tr
                      key={category}
                      className="border-b border-[hsl(var(--outline-variant))]"
                    >
                      <th scope="row" className="px-5 py-4 font-medium">
                        {category}
                      </th>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded bg-[hsl(var(--surface-high))] px-2 py-1 text-xs">
                          {getCategoryType(category)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="inline-grid min-h-8 min-w-8 place-items-center rounded text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-high))] disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={isUsed}
                          title={
                            isUsed
                              ? 'Cannot delete a category with existing transactions'
                              : `Delete ${category}`
                          }
                          onClick={() => deleteCategory(category)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Delete {category}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};

export default SettingsPage;
