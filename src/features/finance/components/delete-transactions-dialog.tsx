'use client';

import { Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DeleteTransactionsDialogProps = {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transactionCount: number;
};

export const DeleteTransactionsDialog = ({
  onConfirm,
  onOpenChange,
  open,
  transactionCount,
}: DeleteTransactionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]">
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogDescription>
            Delete {transactionCount}{' '}
            {transactionCount === 1 ? 'transaction' : 'transactions'}? This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
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
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-destructive px-4 text-sm font-semibold text-destructive-foreground"
            onClick={onConfirm}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
