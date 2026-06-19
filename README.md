# SpendLens

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

## Persistence

The app supports two finance data stores:

- `NEXT_PUBLIC_FINANCE_STORE_MODE=localStorage` keeps data in the browser.
- `NEXT_PUBLIC_FINANCE_STORE_MODE=database` saves finance data through the
  server API into PostgreSQL.

For a Railway-hosted PostgreSQL database, set:

```bash
NEXT_PUBLIC_FINANCE_STORE_MODE=database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Use Railway's private `DATABASE_URL` when the app is also deployed on Railway.
For local development against Railway's hosted database, use the public
connection URL. If the public connection requires TLS, append
`?sslmode=require`.

## Current Scope

The app includes CSV import, local Ollama categorization, transaction review,
import history/review, settings, statistics, and localStorage or PostgreSQL
persistence.
