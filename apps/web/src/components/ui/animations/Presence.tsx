import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface PresenceProps {
  children: ReactNode;
  isVisible: boolean;
  enterAnimation?: string;
  exitAnimation?: string;
  duration?: number;
  className?: string;
}

export function Presence({
  children,
  isVisible,
  enterAnimation = 'animate-fade-in',
  exitAnimation = 'animate-fade-out',
  duration = 250,
  className,
}: PresenceProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [animationClass, setAnimationClass] = useState(isVisible ? enterAnimation : '');

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setAnimationClass(enterAnimation);
      return undefined;
    }

    if (shouldRender) {
      setAnimationClass(exitAnimation);
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isVisible, enterAnimation, exitAnimation, duration, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className={cn(animationClass, className)} style={{ animationDuration: `${duration}ms` }}>
      {children}
    </div>
  );
}
