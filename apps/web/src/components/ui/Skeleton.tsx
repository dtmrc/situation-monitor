import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

const variantClasses = {
  text: 'rounded h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-md',
};

export function Skeleton({ className, variant = 'rectangular', width, height }: SkeletonProps) {
  return (
    <div
      className={cn('bg-secondary animate-shimmer', variantClasses[variant], className)}
      style={{ width, height }}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="rectangular" height={100} />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-border">
      <td className="p-3">
        <Skeleton variant="text" width={80} />
      </td>
      <td className="p-3">
        <Skeleton variant="text" />
      </td>
      <td className="p-3">
        <Skeleton variant="text" width={100} />
      </td>
      <td className="p-3">
        <Skeleton variant="text" width={60} />
      </td>
    </tr>
  );
}

export function SkeletonMetric() {
  return (
    <div className="space-y-2">
      <Skeleton variant="text" width={60} height={12} />
      <Skeleton variant="text" width={100} height={32} />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}
