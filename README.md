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

Database mode uses the server-side `DATABASE_URL` only. Do not expose it with a
`NEXT_PUBLIC_` prefix, and do not call Supabase or Railway directly from client
components. The app creates its normalized SpendLens tables on first use through
`/api/finance-store`.

For any PostgreSQL provider, set:

```bash
NEXT_PUBLIC_FINANCE_STORE_MODE=database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

URL-encode special characters in the username/password before putting the value
in `.env`.

For Supabase:

- Create or open a Supabase project.
- Copy the PostgreSQL connection string from the database settings.
- Put that value in `.env` as `DATABASE_URL`.
- Use a URI that is reachable from where Next.js is running. For local
  development, that means a public or pooled connection string, not an internal
  cloud-only hostname.
- Keep or append `?sslmode=require` when the copied URI does not already include
  an SSL mode.

For Railway:

- Add a PostgreSQL service to the Railway project.
- When the app is deployed on Railway, set `DATABASE_URL` to Railway's Postgres
  `DATABASE_URL` variable. The private/internal URL is preferred when the app and
  database are in the same Railway project.
- For local development against Railway's hosted database, use Railway's public
  PostgreSQL connection URL because your machine cannot use Railway private
  networking.
- If the public connection requires TLS, append `?sslmode=require`.

Local PostgreSQL works too:

```bash
NEXT_PUBLIC_FINANCE_STORE_MODE=database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spendlens
```

## Current Scope

The app includes CSV import, local Ollama categorization, transaction review,
import history/review, settings, statistics, and localStorage or PostgreSQL
persistence.
