import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn } from '@/utils/cn';

type PanelProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  clipped?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export const Panel = <T extends ElementType = 'section'>({
  as,
  children,
  className,
  clipped = false,
  ...props
}: PanelProps<T>) => {
  const Component = as ?? 'section';

  return (
    <Component
      className={cn(
        'rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))]',
        clipped && 'overflow-clip',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

type PanelHeaderProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode;
};

export const PanelHeader = ({
  children,
  className,
  ...props
}: PanelHeaderProps) => {
  return (
    <div
      className={cn(
        'border-b border-[hsl(var(--outline-variant))] p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
