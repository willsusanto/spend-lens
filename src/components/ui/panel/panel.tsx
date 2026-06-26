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
        'animate-enter rounded-2xl border border-[hsl(var(--outline-variant)/0.65)] bg-[hsl(var(--surface-lowest)/0.86)] shadow-[0_20px_60px_hsl(var(--foreground)/0.08)] backdrop-blur-xl',
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
        'border-b border-[hsl(var(--outline-variant)/0.65)] p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
