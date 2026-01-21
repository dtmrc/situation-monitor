import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface CollapseProps {
  children: ReactNode;
  isOpen: boolean;
  duration?: number;
  className?: string;
}

export function Collapse({ children, isOpen, duration = 250, className }: CollapseProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(isOpen ? 'auto' : 0);

  useEffect(() => {
    if (!contentRef.current) return undefined;

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      // After animation, set to auto for dynamic content
      const timer = setTimeout(() => setHeight('auto'), duration);
      return () => clearTimeout(timer);
    }

    // First set explicit height, then collapse
    setHeight(contentRef.current.scrollHeight);
    requestAnimationFrame(() => setHeight(0));
    return undefined;
  }, [isOpen, duration]);

  return (
    <div
      className={cn('overflow-hidden transition-[height]', className)}
      style={{
        height,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'var(--ease-out)',
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
