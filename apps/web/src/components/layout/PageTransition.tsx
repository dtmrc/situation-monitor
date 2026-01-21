import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn('animate-fade-in-up', className)}>{children}</div>;
}
