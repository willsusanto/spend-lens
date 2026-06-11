# LedgerLocal

Local-first personal finance cleanup built with Next.js, React, TypeScript, and
Tailwind CSS.

The app is aimed at a weekly workflow:

- upload exported bank or card CSV files
- categorize transactions locally
- review uncertain rows
- save corrections as reusable knowledge

## Development

Prerequisites:

- Node 20+
- Yarn 1.22+

```bash
cp .env.example .env
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current Scope

The first implemented screen is the weekly summary dashboard. Transactions,
imports, settings, SQLite persistence, CSV parsing, and Ollama categorization are
next.
