import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn } from '@/utils/cn';

type PageContainerSize = 'narrow' | 'wide';
type PageContainerFlow = 'block' | 'grid' | 'space';

type PageContainerProps<T extends ElementType = 'div'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  flow?: PageContainerFlow;
  size?: PageContainerSize;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

const pageContainerSizes: Record<PageContainerSize, string> = {
  narrow: 'max-w-3xl',
  wide: 'max-w-[90rem]',
};

const pageContainerFlows: Record<PageContainerFlow, string> = {
  block: '',
  grid: 'grid content-start gap-6',
  space: 'space-y-8',
};

export const PageContainer = <T extends ElementType = 'div'>({
  as,
  children,
  className,
  flow = 'block',
  size = 'wide',
  ...props
}: PageContainerProps<T>) => {
  const Component = as ?? 'div';

  return (
    <Component
      className={cn(
        'mx-auto w-full',
        pageContainerSizes[size],
        pageContainerFlows[flow],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

type PageHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export const PageHeader = ({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
}: PageHeaderProps) => {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div>
        {eyebrow}
        <h1 className="text-2xl font-bold leading-8 md:text-3xl md:leading-9">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[hsl(var(--on-surface-variant))]">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
};
