import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

const TransactionDetailPage = () => {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col bg-[hsl(var(--background))] px-4 py-8 md:px-8">
      <header className="mb-8">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--on-surface-variant))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Transactions
        </Link>
      </header>

      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-9 text-balance">
            AWS Web Services
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--on-surface-variant))]">
            Posted on Oct 12, 2023 • Card ending in 4092
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-3xl font-bold leading-9">-$142.50</p>
          <span className="mt-2 inline-flex items-center gap-2 rounded bg-[hsl(var(--surface-high))] px-2 py-1 text-xs font-medium text-[hsl(var(--on-surface-variant))]">
            <span className="size-1.5 rounded-full bg-primary" />
            Pending Review
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-6 md:col-span-2">
          <section className="rounded-lg border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-6">
            <h2 className="mb-4 border-b border-[hsl(var(--outline-variant))] pb-4 text-xl font-semibold">
              Categorization
            </h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Category</span>
                <select className="mt-2 min-h-10 w-full rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-3 text-sm">
                  <option>Software & Cloud</option>
                  <option>Office Supplies</option>
                  <option>Travel</option>
                  <option>Uncategorized</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Internal Notes</span>
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] px-3 py-2 text-sm"
                  placeholder="Add context for this expense..."
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-6">
            <h2 className="mb-4 border-b border-[hsl(var(--outline-variant))] pb-4 text-xl font-semibold">
              Raw Data
            </h2>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                  Raw Description
                </dt>
                <dd className="rounded bg-[hsl(var(--surface-high))] px-2 py-1 font-mono text-[0.8125rem]">
                  AMZN WEB SRVCS 888-802-3000 WA
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                  Reference ID
                </dt>
                <dd className="font-mono text-[0.8125rem]">
                  REF-9284719-XJ
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-1 text-[hsl(var(--on-surface-variant))]">
                  MCC
                </dt>
                <dd className="font-mono text-[0.8125rem]">
                  4816 (Computer Network/Info Services)
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-5" aria-hidden="true" />
              <h2 className="text-xl font-semibold">AI Insight</h2>
            </div>
            <div className="mb-4">
              <p className="mb-1 text-sm font-medium text-[hsl(var(--on-surface-variant))]">
                Confidence Score
              </p>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-clip rounded-full bg-[hsl(var(--surface-high))]">
                  <div className="h-full w-[31%] rounded-full bg-primary" />
                </div>
                <span className="text-sm font-bold">31%</span>
              </div>
            </div>
            <p className="border-l-2 border-[hsl(var(--outline-variant))] pl-3 text-sm text-[hsl(var(--on-surface-variant))] text-pretty">
              Suggested category: <strong>Software & Cloud</strong>. Confidence
              is low because this merchant ID has inconsistent recent patterns.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-6">
            <button className="min-h-10 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Approve
            </button>
            <button className="min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-4 py-2 text-sm font-medium">
              Save
            </button>
            <button className="min-h-10 rounded px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--surface-low))]">
              Save & Create Rule
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default TransactionDetailPage;
