import { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/utils/cn';

type DataTableAlign = 'center' | 'left' | 'right';

const tableAlignClassNames: Record<DataTableAlign, string> = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
};

type DataTableProps = ComponentPropsWithoutRef<'table'> & {
  caption: ReactNode;
  minWidthClassName?: string;
  wrapperClassName?: string;
};

export const DataTable = ({
  caption,
  children,
  className,
  minWidthClassName = 'min-w-[48rem]',
  wrapperClassName,
  ...props
}: DataTableProps) => {
  return (
    <div className={cn('overflow-x-auto', wrapperClassName)}>
      <table
        className={cn(
          'w-full border-collapse text-left text-sm',
          minWidthClassName,
          className,
        )}
        {...props}
      >
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
};

type DataTableHeaderProps = ComponentPropsWithoutRef<'thead'> & {
  sticky?: boolean;
};

export const DataTableHeader = ({
  className,
  sticky = false,
  ...props
}: DataTableHeaderProps) => {
  return (
    <thead
      className={cn(
        sticky
          ? 'sticky top-0 z-10 bg-[hsl(var(--surface-lowest)/0.94)] backdrop-blur-xl'
          : 'bg-[hsl(var(--surface-low))]',
        className,
      )}
      {...props}
    />
  );
};

export const DataTableHeaderRow = ({
  className,
  ...props
}: ComponentPropsWithoutRef<'tr'>) => {
  return (
    <tr
      className={cn('border-b border-[hsl(var(--outline-variant))]', className)}
      {...props}
    />
  );
};

type DataTableHeaderCellProps = ComponentPropsWithoutRef<'th'> & {
  align?: DataTableAlign;
};

export const DataTableHeaderCell = ({
  align = 'left',
  className,
  scope = 'col',
  ...props
}: DataTableHeaderCellProps) => {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--on-surface-variant))]',
        tableAlignClassNames[align],
        className,
      )}
      scope={scope}
      {...props}
    />
  );
};

export type DataTableColumn = {
  align?: DataTableAlign;
  className?: string;
  key: string;
  label: ReactNode;
};

type DataTableHeaderCellsProps = {
  columns: DataTableColumn[];
};

export const DataTableHeaderCells = ({
  columns,
}: DataTableHeaderCellsProps) => {
  return (
    <>
      {columns.map((column) => (
        <DataTableHeaderCell
          key={column.key}
          align={column.align}
          className={column.className}
        >
          {column.label}
        </DataTableHeaderCell>
      ))}
    </>
  );
};

export const DataTableBody = ({
  className,
  ...props
}: ComponentPropsWithoutRef<'tbody'>) => {
  return <tbody className={cn(className)} {...props} />;
};

type DataTableRowProps = ComponentPropsWithoutRef<'tr'> & {
  interactive?: boolean;
  tone?: 'default' | 'muted' | 'warning';
};

export const DataTableRow = ({
  className,
  interactive = true,
  tone = 'default',
  ...props
}: DataTableRowProps) => {
  return (
    <tr
      className={cn(
        'border-b border-[hsl(var(--outline-variant)/0.65)] last:border-b-0',
        interactive &&
          'transition-colors hover:bg-[hsl(var(--surface-low)/0.75)]',
        tone === 'muted' &&
          'bg-[hsl(var(--surface-low))] text-[hsl(var(--on-surface-variant))]',
        tone === 'warning' &&
          'border-l-4 border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/25',
        className,
      )}
      {...props}
    />
  );
};

type DataTableCellProps = ComponentPropsWithoutRef<'td'> & {
  align?: DataTableAlign;
  muted?: boolean;
  noWrap?: boolean;
};

export const DataTableCell = ({
  align = 'left',
  className,
  muted = false,
  noWrap = false,
  ...props
}: DataTableCellProps) => {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle',
        tableAlignClassNames[align],
        muted && 'text-[hsl(var(--on-surface-variant))]',
        noWrap && 'whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
};

type DataTableRowHeaderProps = ComponentPropsWithoutRef<'th'> & {
  muted?: boolean;
  noWrap?: boolean;
};

export const DataTableRowHeader = ({
  className,
  muted = false,
  noWrap = false,
  scope = 'row',
  ...props
}: DataTableRowHeaderProps) => {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left align-middle font-medium',
        muted && 'text-[hsl(var(--on-surface-variant))]',
        noWrap && 'whitespace-nowrap',
        className,
      )}
      scope={scope}
      {...props}
    />
  );
};

type DataTableEmptyRowProps = ComponentPropsWithoutRef<'td'> & {
  children: ReactNode;
  colSpan: number;
};

export const DataTableEmptyRow = ({
  children,
  className,
  colSpan,
  ...props
}: DataTableEmptyRowProps) => {
  return (
    <DataTableRow interactive={false}>
      <td
        className={cn(
          'px-4 py-10 text-center text-sm text-[hsl(var(--on-surface-variant))]',
          className,
        )}
        colSpan={colSpan}
        {...props}
      >
        {children}
      </td>
    </DataTableRow>
  );
};
