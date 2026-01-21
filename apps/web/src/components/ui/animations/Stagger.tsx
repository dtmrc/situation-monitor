import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

interface StaggerProps {
  children: ReactNode;
  staggerDelay?: number; // Delay between each child (ms)
  initialDelay?: number; // Initial delay before first item
  className?: string;
}

export function Stagger({
  children,
  staggerDelay = 75,
  initialDelay = 0,
  className,
}: StaggerProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        const delay = initialDelay + index * staggerDelay;

        return cloneElement(child as ReactElement<{ style?: CSSProperties }>, {
          style: {
            ...((child.props as { style?: CSSProperties }).style || {}),
            animationDelay: `${delay}ms`,
          },
        });
      })}
    </div>
  );
}
