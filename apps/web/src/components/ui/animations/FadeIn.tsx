import { type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FadeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface FadeInProps {
  children: ReactNode;
  direction?: FadeDirection;
  delay?: number;
  duration?: number;
  className?: string;
}

const directionClasses: Record<FadeDirection, string> = {
  none: 'animate-fade-in',
  up: 'animate-fade-in-up',
  down: 'animate-fade-in-down',
  left: 'animate-fade-in-left',
  right: 'animate-fade-in-right',
};

export function FadeIn({
  children,
  direction = 'none',
  delay = 0,
  duration,
  className,
}: FadeInProps) {
  const style: CSSProperties = {
    animationDelay: delay ? `${delay}ms` : undefined,
    animationDuration: duration ? `${duration}ms` : undefined,
  };

  return (
    <div className={cn('opacity-0', directionClasses[direction], className)} style={style}>
      {children}
    </div>
  );
}
