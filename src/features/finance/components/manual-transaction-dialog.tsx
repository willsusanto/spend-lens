'use client';

import { Plus } from 'lucide-react';
import { FormEventHandler } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';

type ManualTransactionDialogProps = {
  categories: string[];
  message: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  open: boolean;
};

const inputClassName =
  'min-h-10 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-3 text-sm';

export const ManualTransactionDialog = ({
  categories,
  message,
  onOpenChange,
  onSubmit,
  open,
}: ManualTransactionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="interactive-lift inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Transaction
        </button>
      </DialogTrigger>
      <DialogContent className="rounded border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Create a manual local ledger entry.
          </DialogDescription>
        </DialogHeader>
        <form
          id="manual-transaction-form"
          className="grid gap-4"
          onSubmit={onSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Date
              <input
                required
                name="date"
                type="date"
                className={inputClassName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Amount
              <input
                required
                min="0"
                name="amount"
                step="0.01"
                type="number"
                className={inputClassName}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Description
            <input required name="details" className={inputClassName} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Category
              <select required name="category" className={inputClassName}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Type
              <select
                required
                name="type"
                defaultValue="expense"
                className={inputClassName}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
          </div>
          {message ? (
            <p
              aria-live="polite"
              className={cn(
                'rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-low))] px-3 py-2 text-sm text-[hsl(var(--on-surface-variant))]',
                message.startsWith('Duplicate') &&
                  'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
              )}
            >
              {message}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              className="min-h-10 rounded border border-[hsl(var(--outline-variant))] px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="submit"
            form="manual-transaction-form"
            className="min-h-10 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Save Transaction
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
