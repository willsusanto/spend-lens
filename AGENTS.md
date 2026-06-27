# AGENTS.md

## Project Snapshot

SpendLens is a local-first personal finance ledger built with Next.js App
Router, React, TypeScript, and Tailwind CSS. The package name is
`spend-lens`, and the product name used in the UI and README is
`SpendLens`.

This project was previously named LedgerLocal. Treat `LedgerLocal` and
`ledgerlocal` references as legacy migration compatibility unless current UI,
README, or package metadata says otherwise.

The app workflow is:

1. Upload a CSV exported from a bank or card account.
2. Parse rows into finance transactions.
3. Detect duplicates before categorization.
4. Send each non-duplicate row to a local Ollama-hosted LLM for categorization.
5. Stage imported rows for review and manual correction.
6. Confirm reviewed imports into the main transaction ledger.

The project started from
[alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react).
Use its architecture docs as background, especially:

- [Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- [Project Standards](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-standards.md)
- [API Layer](https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md)
- [Components And Styling](https://github.com/alan2207/bulletproof-react/blob/master/docs/components-and-styling.md)
- [State Management](https://github.com/alan2207/bulletproof-react/blob/master/docs/state-management.md)
- [Testing](https://github.com/alan2207/bulletproof-react/blob/master/docs/testing.md)

## Commands

Prerequisites:

- Node 20+
- Yarn 1.22+

Common commands:

```bash
cp .env.example .env
yarn install
yarn dev
yarn lint
yarn check-types
yarn test
yarn build
yarn storybook
yarn generate
```

Use `yarn check-types`, `yarn lint`, and focused `yarn test` runs after code
changes when practical. Do not edit generated or dependency folders such as
`.next/` and `node_modules/`.

## Repository Structure

```text
src/
  app/                 Next.js App Router pages, layouts, providers, API routes
  components/          Shared layouts, errors, and UI primitives
  config/              Environment parsing and route/path constants
  features/            Feature modules; most product code belongs here
  hooks/               Shared React hooks
  lib/                 Preconfigured libraries such as React Query
  styles/              Global Tailwind CSS
  testing/             Vitest and Testing Library setup/utilities
  utils/               Shared utility functions
generators/            Plop component generator templates
public/                Static assets
```

Important app routes:

- `src/app/page.tsx` renders the finance home dashboard.
- `src/app/imports/page.tsx` renders import history.
- `src/app/imports/[importId]/review/page.tsx` renders import review.
- `src/app/transactions/page.tsx` renders the transaction list/review view.
- `src/app/transactions/[transactionId]/page.tsx` renders transaction detail.
- `src/app/settings/page.tsx` renders categories and Ollama settings.
- `src/app/statistics/page.tsx` renders statistics.

Important API routes:

- `src/app/api/categorize/route.ts` calls Ollama and normalizes AI results.
- `src/app/api/ollama/test/route.ts` checks endpoint and model availability.
- `src/app/api/finance-store/route.ts` reads/writes the database-backed store.

## Architecture Rules

This codebase follows the Bulletproof React feature-based model:

- Keep app-level composition in `src/app`.
- Keep domain/product logic in `src/features`.
- Keep broadly reusable components/hooks/utils in shared folders.
- Avoid cross-feature imports. If two features need the same code, move it to a
  shared folder or compose the features from `src/app`.
- Keep dependencies flowing in one direction: shared code is used by features,
  and features are composed by the app layer. Features should not import from
  `src/app`.

The ESLint config enforces these boundaries with `import/no-restricted-paths`
and `import/no-cycle`. Some upstream placeholder feature names still exist in
the config; the active local domain feature is `src/features/finance`.

Use absolute imports from `src` with the `@/` alias:

```ts
import { Button } from '@/components/ui/button';
import { useFinanceData } from '@/features/finance/use-finance-data';
```

## Syntax And Style

- TypeScript is strict. Prefer typed data at boundaries and avoid weakening
  existing types.
- Files and folders under `src` use kebab-case. React component identifiers use
  PascalCase.
- Formatting is Prettier: single quotes, trailing commas, 2 spaces, 80 column
  print width.
- Imports are grouped and alphabetized by ESLint.
- Use `.tsx` for React components and hooks returning JSX.
- Add `'use client'` only to files that need browser APIs, React state/effects,
  or client contexts.
- App Router route handlers that use Node-only packages should export
  `runtime = 'nodejs'`.
- Browser storage and `window` access must stay inside client components/hooks
  and usually inside effects or guarded branches.

## UI Conventions

- Tailwind CSS is the primary styling system.
- Use `cn` from `src/utils/cn.ts` for conditional class merging.
- Shared UI primitives live under `src/components/ui`.
- Feature-specific UI belongs under `src/features/<feature>/components`.
- Prefer existing primitives before adding new shared UI.
- Radix UI primitives, class-variance-authority, and Tailwind utilities are
  already in use.
- Keep Next.js pages thin: route files should import and render feature
  components rather than owning product logic.

## Finance Feature Map

Most domain work is in `src/features/finance`:

- `data.ts` defines core domain types, statuses, categories, formatting helpers,
  and seed demo data.
- `csv.ts` parses uploaded CSV text into an `ImportBatch` and
  `FinanceTransaction[]`.
- `duplicate-transactions.ts` builds duplicate signatures from normalized date,
  description, absolute amount, and CR/DB direction.
- `finance-import-state.ts` contains import batch status rules, staged import
  deletion/confirmation planning, staged import restoration, and
  categorization chunking.
- `finance-category-drafts.ts` applies manual category choices, clears matching
  category drafts, and recalculates staged import status after category edits.
- `finance-transaction-state.ts` contains pure helpers for manual transaction
  creation, draft category updates, bulk category edits, and transaction detail
  saves.
- `finance-settings.ts` defines default categories, default Ollama endpoint,
  default model, and normalization helpers.
- `use-finance-settings.tsx` stores user categories and Ollama settings in
  localStorage.
- `finance-store.ts` defines the `FinanceStore` interface, the localStorage
  implementation, the API-backed implementation, and store selection.
- `postgres-finance-store.ts` is the current server-side PostgreSQL
  implementation behind `/api/finance-store`.
- `ollama-categorization.ts` builds the categorization prompt, parses Ollama
  JSON responses, applies model output back onto transactions, clamps
  confidence, derives categorization status, and creates manual-review
  fallbacks for `/api/categorize`.
- `use-finance-data.tsx` is the client-side orchestrator for loading data,
  importing CSVs, categorizing rows, staging imports, draft category edits,
  manual transactions, deletes, approvals, and confirmation.
- `components/` contains the finance screens and feature UI. Shared
  finance-only table/dialog/filter pieces such as `transaction-table-parts.tsx`,
  `manual-transaction-dialog.tsx`, `delete-transactions-dialog.tsx`,
  `transactions-filter-bar.tsx`, and `transactions-review-metrics.tsx` should be
  reused before adding another finance table control or review dialog.
- `__tests__/` contains finance behavior tests.

The statistics feature keeps chart and aggregation math in
`src/features/statistics/statistics-breakdown.ts`; keep new statistics
calculations there with focused tests rather than embedding them in
`statistics-page.tsx`.

## CSV Import Details

`parseTransactionsCsv` currently supports generic CSVs and Indonesian bank
statement exports.

Generic fields it tries to read include:

- description text from `merchant`, `payee`, `name`, `description`, `details`,
  `memo`, or `narrative`
- date from `date`, `transaction date`, or `posted date`
- amount from `amount`, `transaction amount`, `debit`, or `credit`
- direction from `cr/db`, `crdb`, `direction`, or `type`

Indonesian bank statement detection looks for normalized headers containing
`tanggal`, `keterangan`, and `jumlah`. It accepts `DD/MM/YYYY` dates and handles
a blank column after `Jumlah` as the CR/DB direction column.

Amounts are normalized so debits are negative and credits are positive. New bank
formats should be added in `csv.ts` with focused tests rather than handled in
UI components.

## Categorization Flow

The categorization flow is deliberately local-first:

1. `useFinanceData.importCsv` reads the uploaded file in the browser.
2. `parseTransactionsCsv` returns staged transactions with `Review` status.
3. `markDuplicateTransactions` marks duplicates before AI categorization.
4. Non-duplicate rows are sent one at a time to `/api/categorize`.
5. `/api/categorize` builds a JSON-only prompt and calls Ollama
   `${endpoint}/api/generate`.
6. Allowed categories are normalized from user settings and always include
   `Uncategorized`.
7. Confidence below 70 or category `Uncategorized` leaves the row in `Review`.
8. Successful categorization sets `categorizationSource: 'ollama'` and records
   the model.
9. Failures fall back to manual review instead of blocking the import.

Prompt construction, Ollama response parsing, confidence clamping, and fallback
transaction creation belong in `src/features/finance/ollama-categorization.ts`.
Keep `/api/categorize/route.ts` focused on HTTP request validation, model
probing, logging, and response composition.

Important defaults:

- Ollama endpoint: `http://localhost:11434`
- Ollama model: `gemma4:12b`
- Import categorization chunk size: `1`
- Import categorization timeout: `1200_000` ms

Do not route real transaction descriptions to a remote hosted LLM unless the
user explicitly asks for that product direction. The current design assumes a
local Ollama server.

## Persistence

The persistence abstraction is `FinanceStore`:

```ts
type FinanceStore = {
  load: () => Promise<FinanceStoreSnapshot>;
  saveImports: (imports: ImportBatch[]) => Promise<void>;
  saveStagedTransactions: (transactions: FinanceTransaction[]) => Promise<void>;
  saveTransactions: (transactions: FinanceTransaction[]) => Promise<void>;
};
```

Store selection happens in `getDefaultFinanceStore`:

- `NEXT_PUBLIC_FINANCE_STORE_MODE=localStorage` uses browser localStorage.
- `NEXT_PUBLIC_FINANCE_STORE_MODE=database` uses `/api/finance-store`.

Current localStorage keys use the SpendLens namespace:

- `spendlens.imports`
- `spendlens.staged-transactions`
- `spendlens.transactions`
- `spendlens.settings`

Legacy `ledgerlocal.*` keys are read once and copied into the current keys when
present. Do not remove this migration path without an explicit data migration
decision.

The current database implementation writes three JSONB state rows to the
`spendlens_finance_state` table:

- `imports`
- `stagedTransactions`
- `transactions`

On startup, the PostgreSQL store creates `spendlens_finance_state` and copies
missing rows from the legacy `ledgerlocal_finance_state` table when it exists.

Future Supabase work should preserve the `FinanceStore` boundary. Prefer
replacing or adding a server-side store implementation and keeping client code
on the existing interface. Do not spread Supabase calls through UI components or
feature hooks unless the persistence architecture is intentionally changed.

Settings are currently separate from `FinanceStore` and stored in localStorage
by `use-finance-settings.tsx`.

## Environment

`src/config/env.ts` validates server environment values with Zod. Relevant
variables:

- `NEXT_PUBLIC_URL` maps to `APP_URL`.
- `NEXT_PUBLIC_FINANCE_STORE_MODE` maps to `FINANCE_STORE_MODE` and accepts
  `localStorage` or `database`.
- `OLLAMA_ENDPOINT` is the server fallback endpoint.
- `OLLAMA_MODEL` is the server fallback model.
- `DATABASE_URL` is required by database mode.

The client also stores user-editable Ollama settings in localStorage and sends
them to the server routes. Remember that `/api/categorize` runs from the Next.js
server process, so the configured Ollama endpoint must be reachable from that
process.

Do not commit local secrets from `.env`.

## Testing Guidance

Test behavior, not implementation details. Existing test patterns:

- Utility/domain tests live close to the feature, for example
  `src/features/finance/__tests__/duplicate-transactions.test.ts`.
- Hook/provider behavior uses Testing Library `renderHook`, `act`, and custom
  test stores, for example `use-finance-data.test.tsx`.
- Shared UI tests live under the relevant component folder.
- Shared form primitives should support both React Hook Form registration and
  plain controlled inputs when that keeps screen code from repeating CSS.

Good candidates for focused tests:

- New CSV bank formats and date/amount direction parsing.
- Duplicate detection changes.
- Import staging and confirmation rules.
- Import status helpers in `finance-import-state.ts`.
- Category draft application helpers in `finance-category-drafts.ts`.
- Manual transaction, transaction list, and detail-save helpers in
  `finance-transaction-state.ts`.
- Store normalization and migration behavior.
- Ollama response parsing and fallback behavior.
- Statistics breakdown, sorting, percentage, and chart geometry helpers.

## Common Change Patterns

Adding a finance screen:

1. Create feature UI under `src/features/finance/components`.
2. Add a thin route file under `src/app`.
3. Reuse `FinanceDataProvider` state through `useFinanceData`.

Adding shared UI:

1. Check `src/components/ui` first.
2. If reusable, add the primitive there with stories/tests when useful.
3. If finance-only, keep it in `src/features/finance/components`.

Adding persisted finance data:

1. Extend `FinanceStoreSnapshot` and related domain types.
2. Update all store implementations and normalizers.
3. Update `/api/finance-store` validation.
4. Add migration-safe defaults for missing stored fields.

Adding a category rule:

1. Update seed/default categories only if it should ship as a default.
2. Update Ollama prompt guidance in `/api/categorize` if the model needs
   category-specific instructions.
3. Keep `Uncategorized` as the manual-review fallback.

Adding a bank CSV format:

1. Extend header detection and field extraction in `csv.ts`.
2. Preserve quoted-field parsing behavior.
3. Add focused parser tests with representative rows.
4. Confirm amount sign and CR/DB direction normalization.

## Agent Cautions

- The worktree may contain user changes. Do not revert unrelated edits.
- Avoid refactoring the upstream architecture unless the task explicitly calls
  for it.
- Keep route files small and push product logic into features.
- Keep persistence behind `FinanceStore` while the app moves toward Supabase.
- Keep legacy `ledgerlocal` storage/table handling unless intentionally
  removing migration support.
- Treat transaction descriptions and bank data as sensitive.
- Remove unused dependencies and generated artifacts together; keep
  `package.json`, `yarn.lock`, and related config in sync.
- Prefer focused, local tests over broad rewrites.
