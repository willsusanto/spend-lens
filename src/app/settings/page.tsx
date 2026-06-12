import { Cable, Link as LinkIcon, Package, Plus, Trash2 } from 'lucide-react';

import { AppShell } from '@/components/layouts/app-shell';
import { PageContainer, PageHeader } from '@/components/layouts/page';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { categories } from '@/features/finance/data';

const SettingsPage = () => {
  return (
    <AppShell>
      <PageContainer size="narrow" flow="space">
        <PageHeader
          title="Settings"
          description="Manage categories, CSV mappings, and local Ollama categorization."
        />

        <Panel clipped>
          <PanelHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Categories</h2>
              <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
                Define categories to organize transactions.
              </p>
            </div>
            <label className="flex gap-2">
              <span className="sr-only">New category</span>
              <input
                className="min-h-9 min-w-0 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                placeholder="New category..."
              />
              <button className="inline-flex min-h-9 items-center gap-1 rounded bg-primary px-3 text-sm font-medium text-primary-foreground">
                <Plus className="size-4" aria-hidden="true" />
                Add
              </button>
            </label>
          </PanelHeader>
          <ul className="divide-y divide-[hsl(var(--outline-variant))]">
            {categories.map((category) => (
              <li
                key={category}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-[hsl(var(--surface-low))] md:px-6"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <span className="size-2 rounded-full bg-secondary-foreground" />
                  {category}
                </span>
                <button className="grid min-h-8 min-w-8 place-items-center rounded text-[hsl(var(--on-surface-variant))] hover:bg-[hsl(var(--surface-high))]">
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Delete {category}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader>
            <h2 className="text-xl font-semibold">CSV Column Mapping</h2>
            <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
              Map bank CSV headers to standard ledger fields.
            </p>
          </PanelHeader>
          <div className="grid gap-6 p-5 md:grid-cols-3">
            {['Transaction Date', 'Amount', 'Description'].map((field) => (
              <label key={field} className="grid gap-2">
                <span className="text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                  {field}
                </span>
                <input
                  className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm"
                  defaultValue={field}
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Package className="size-5" aria-hidden="true" />
              Intelligence
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--on-surface-variant))]">
              Configure local LLM settings for auto-categorization via Ollama.
            </p>
          </PanelHeader>
          <div className="space-y-6 p-5">
            <label className="grid max-w-lg gap-2">
              <span className="text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                Ollama Endpoint URL
              </span>
              <span className="relative">
                <LinkIcon
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--on-surface-variant))]"
                  aria-hidden="true"
                />
                <input
                  className="min-h-10 w-full rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] pl-10 pr-3 font-mono text-sm"
                  defaultValue="http://localhost:11434"
                  type="url"
                />
              </span>
            </label>
            <label className="grid max-w-lg gap-2">
              <span className="text-xs font-medium text-[hsl(var(--on-surface-variant))]">
                Model Name
              </span>
              <input
                className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 font-mono text-sm"
                defaultValue="llama3"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-high))] px-4 text-sm font-medium">
                <Cable className="size-4" aria-hidden="true" />
                Test Connection
              </button>
              <button className="min-h-10 rounded bg-primary px-4 text-sm font-medium text-primary-foreground">
                Save Configuration
              </button>
            </div>
          </div>
        </Panel>
      </PageContainer>
    </AppShell>
  );
};

export default SettingsPage;
