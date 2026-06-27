import { Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

import { formatSignedCurrency, pageSizeOptions } from '@/features/finance/data';
import { cn } from '@/utils/cn';

type CategorySelectProps = {
  ariaLabel: string;
  categories: string[];
  className?: string;
  disabled?: boolean;
  hasDraft?: boolean;
  isInvalid?: boolean;
  onChange: (category: string) => void;
  size?: 'sm' | 'md';
  value: string;
};

const categorySelectSizes = {
  sm: 'min-h-9 w-44 px-2 text-xs',
  md: 'min-h-10 w-full px-3 text-sm',
};

export const CategorySelect = ({
  ariaLabel,
  categories,
  className,
  disabled,
  hasDraft,
  isInvalid,
  onChange,
  size = 'sm',
  value,
}: CategorySelectProps) => {
  return (
    <select
      aria-label={ariaLabel}
      className={cn(
        'rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--background))] font-medium disabled:cursor-not-allowed disabled:opacity-60',
        categorySelectSizes[size],
        isInvalid &&
          'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
        hasDraft && 'border-primary bg-[hsl(var(--surface-low))]',
        className,
      )}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
};

type SignedAmountProps = {
  amount: number;
  className?: string;
};

export const SignedAmount = ({ amount, className }: SignedAmountProps) => {
  return (
    <span
      className={cn(
        'font-mono font-semibold',
        amount > 0 && 'text-emerald-700 dark:text-emerald-300',
        className,
      )}
    >
      {formatSignedCurrency(amount)}
    </span>
  );
};

type TransactionStatusBadgeProps = {
  className?: string;
  icon?: ReactNode;
  state?: 'approved' | 'duplicate' | 'neutral' | 'needs-review' | 'ready';
  text: ReactNode;
};

export const TransactionStatusBadge = ({
  className,
  icon,
  state = 'neutral',
  text,
}: TransactionStatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        state === 'approved' && 'bg-primary text-primary-foreground',
        state === 'duplicate' &&
          'bg-[hsl(var(--surface-highest))] text-[hsl(var(--on-surface-variant))]',
        state === 'needs-review' &&
          'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
        state === 'neutral' && 'bg-[hsl(var(--surface-high))]',
        state === 'ready' && 'bg-[hsl(var(--surface-high))]',
        className,
      )}
    >
      {icon ??
        (state === 'approved' ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <span
            className={cn(
              'size-1.5 rounded-full bg-[hsl(var(--on-surface-variant))]',
              state === 'needs-review' && 'bg-amber-600',
              state === 'ready' && 'bg-primary',
              state === 'duplicate' && 'bg-[hsl(var(--outline))]',
            )}
          />
        ))}
      {text}
    </span>
  );
};

type DeleteRowButtonProps = {
  children?: ReactNode;
  className?: string;
  iconOnly?: boolean;
  onClick: () => void;
  srLabel?: string;
};

export const DeleteRowButton = ({
  children = 'Delete',
  className,
  iconOnly = false,
  onClick,
  srLabel,
}: DeleteRowButtonProps) => {
  return (
    <button
      type="button"
      className={cn(
        'min-h-8 rounded border border-[hsl(var(--outline-variant))] text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-low))] disabled:opacity-40',
        iconOnly
          ? 'grid min-w-8 place-items-center px-0'
          : 'inline-flex items-center gap-1.5 px-2',
        className,
      )}
      onClick={onClick}
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
      {iconOnly ? null : children}
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </button>
  );
};

type TablePaginationFooterProps = {
  className?: string;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: (typeof pageSizeOptions)[number]) => void;
  page: number;
  pageCount: number;
  pageSize: (typeof pageSizeOptions)[number];
  selectedCount?: number;
  totalCount: number;
  visibleCount: number;
};

export const TablePaginationFooter = ({
  className,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  selectedCount = 0,
  totalCount,
  visibleCount,
}: TablePaginationFooterProps) => {
  const selectionLabel =
    selectedCount > 0 ? ` - ${selectedCount} selected` : '';

  return (
    <footer
      className={cn(
        'flex flex-col gap-3 border-t border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.9)] px-4 py-3 text-xs text-[hsl(var(--on-surface-variant))] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <span>
        Showing {visibleCount} of {totalCount}
        {itemLabel ? ` ${itemLabel}` : ''}
        {selectionLabel}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            className="min-h-8 rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface))] px-2 text-xs"
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(
                Number(event.target.value) as (typeof pageSizeOptions)[number],
              )
            }
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <span>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))] disabled:opacity-40"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only">Previous page</span>
        </button>
        <button
          type="button"
          className="grid min-h-8 min-w-8 place-items-center rounded hover:bg-[hsl(var(--surface-high))] disabled:opacity-40"
          disabled={page === pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="sr-only">Next page</span>
        </button>
      </div>
    </footer>
  );
};
