'use client';

import {
  Cable,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Wand2,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Input } from '@/components/ui/form';
import { Panel, PanelHeader } from '@/components/ui/panel';
import {
  DataTable,
  DataTableActionButton,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCells,
  DataTableHeaderRow,
  DataTableRow,
  DataTableRowHeader,
} from '@/components/ui/table';
import { FinanceAppShell } from '@/features/finance/components/finance-app-shell';
import {
  getCategoryColor,
  uncategorizedCategory,
} from '@/features/finance/finance-settings';
import { useFinanceData } from '@/features/finance/use-finance-data';
import { useFinanceSettings } from '@/features/finance/use-finance-settings';

type TestConnectionResponse = {
  availableModels?: string[];
  message?: string;
  model?: string;
  ok?: boolean;
};

const getCategoryType = (category: string) =>
  category === 'Income' ? 'Income' : 'Expense';

const categorySettingsColumns = [
  { key: 'category-name', label: 'Category Name' },
  { key: 'color', label: 'Color' },
  { key: 'type', label: 'Type' },
  { align: 'right' as const, key: 'actions', label: 'Actions' },
];

export const SettingsPage = () => {
  const { activeImport, stagedTransactions, transactions } = useFinanceData();
  const {
    addCategory,
    categories,
    categoryColors,
    deleteCategory,
    ollamaEndpoint,
    ollamaModel,
    resetCategories,
    saveOllamaSettings,
    updateCategoryColor,
  } = useFinanceSettings();
  const [endpointDraft, setEndpointDraft] = useState(ollamaEndpoint);
  const [modelDraft, setModelDraft] = useState(ollamaModel);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(
    null,
  );
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const usedCategories = useMemo(
    () =>
      new Set(
        [
          ...transactions,
          ...stagedTransactions,
          ...activeImport.processedTransactions,
        ].map((transaction) => transaction.category),
      ),
    [activeImport.processedTransactions, stagedTransactions, transactions],
  );
  const assignableCategoryCount = categories.filter(
    (category) => category !== uncategorizedCategory,
  ).length;

  useEffect(() => {
    setEndpointDraft(ollamaEndpoint);
    setModelDraft(ollamaModel);
  }, [ollamaEndpoint, ollamaModel]);

  const saveConnectionSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveOllamaSettings({
      ollamaEndpoint: endpointDraft,
      ollamaModel: modelDraft,
    });
    setConnectionMessage('Connection settings saved locally.');
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionMessage('Testing Ollama connection...');

    try {
      const response = await fetch('/api/ollama/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ollamaEndpoint: endpointDraft,
          ollamaModel: modelDraft,
        }),
      });
      const result = (await response.json()) as TestConnectionResponse;

      if (!response.ok || !result.ok) {
        setConnectionMessage(
          result.message ?? 'Could not connect to Ollama with these settings.',
        );

        return;
      }

      setConnectionMessage(
        result.message ??
          `Connected to Ollama${result.model ? ` with ${result.model}` : ''}.`,
      );
    } catch (error) {
      setConnectionMessage(
        error instanceof Error
          ? error.message
          : 'Could not connect to Ollama with these settings.',
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const addCategoryFromForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get('category')).trim();
    const exists = categories.some(
      (category) => category.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

    if (!name) {
      setCategoryMessage('Enter a category name first.');

      return;
    }

    if (exists) {
      setCategoryMessage(`${name} already exists.`);

      return;
    }

    addCategory(name);
    setCategoryMessage(`${name} added.`);
    event.currentTarget.reset();
  };

  const deleteCategoryFromSettings = (category: string) => {
    if (usedCategories.has(category)) {
      setCategoryMessage(`${category} is used by existing transactions.`);

      return;
    }

    deleteCategory(category);
    setCategoryMessage(`${category} deleted.`);
  };

  const resetCategorySettings = () => {
    resetCategories();
    setCategoryMessage('Categories reset to the default list.');
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
              imported transactions. Public endpoints are blocked.
            </p>
          </PanelHeader>
          <form className="grid gap-5 p-5" onSubmit={saveConnectionSettings}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                required
                className="min-h-10 border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] shadow-none"
                label="Ollama Endpoint URL"
                type="url"
                value={endpointDraft}
                onChange={(event) => setEndpointDraft(event.target.value)}
              />
              <Input
                required
                className="min-h-10 border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] shadow-none"
                label="Model Name"
                value={modelDraft}
                onChange={(event) => setModelDraft(event.target.value)}
              />
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
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-semibold transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40"
                disabled={isTestingConnection}
                onClick={testConnection}
              >
                {isTestingConnection ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Cable className="size-4" aria-hidden="true" />
                )}
                Test Connection
              </button>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Save className="size-4" aria-hidden="true" />
                Save Settings
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
                onClick={resetCategorySettings}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
              <form className="flex gap-2" onSubmit={addCategoryFromForm}>
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
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--surface-low))]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Category
                </button>
              </form>
            </div>
            {categoryMessage ? (
              <p
                aria-live="polite"
                className="text-sm text-[hsl(var(--on-surface-variant))] sm:basis-full"
              >
                {categoryMessage}
              </p>
            ) : null}
          </PanelHeader>
          <DataTable
            caption="Category settings"
            minWidthClassName="min-w-[34rem]"
          >
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHeaderCells columns={categorySettingsColumns} />
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {categories.map((category) => {
                const categoryColor = getCategoryColor(
                  category,
                  categoryColors,
                  categories.indexOf(category),
                );
                const isUsed = usedCategories.has(category);
                const isRequired = category === uncategorizedCategory;
                const isLastAssignable =
                  category !== uncategorizedCategory &&
                  assignableCategoryCount <= 1;
                const deleteDisabled = isUsed || isRequired || isLastAssignable;
                const deleteTitle = isRequired
                  ? 'Uncategorized is required for low-confidence imports'
                  : isLastAssignable
                    ? 'Keep at least one assignable category'
                    : isUsed
                      ? 'Cannot delete a category with existing transactions'
                      : `Delete ${category}`;

                return (
                  <DataTableRow key={category}>
                    <DataTableRowHeader>{category}</DataTableRowHeader>
                    <DataTableCell>
                      <label className="inline-flex items-center gap-3">
                        <span className="sr-only">Color for {category}</span>
                        <input
                          aria-label={`Color for ${category}`}
                          className="size-8 cursor-pointer rounded border border-[hsl(var(--outline-variant))] bg-transparent p-0.5"
                          type="color"
                          value={categoryColor}
                          onChange={(event) =>
                            updateCategoryColor(
                              category,
                              event.currentTarget.value,
                            )
                          }
                        />
                        <span className="font-mono text-xs uppercase text-[hsl(var(--on-surface-variant))]">
                          {categoryColor}
                        </span>
                      </label>
                    </DataTableCell>
                    <DataTableCell>
                      <span className="inline-flex rounded bg-[hsl(var(--surface-high))] px-2 py-1 text-xs">
                        {getCategoryType(category)}
                      </span>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <DataTableActionButton
                        disabled={deleteDisabled}
                        icon={<Trash2 className="size-4" aria-hidden="true" />}
                        label={`Delete ${category}`}
                        title={deleteTitle}
                        onClick={() => deleteCategoryFromSettings(category)}
                      />
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </Panel>
      </PageContainer>
    </FinanceAppShell>
  );
};
