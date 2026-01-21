import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'tactical';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

export function Spinner({ size = 'md', variant = 'default', className }: SpinnerProps) {
  if (variant === 'tactical') {
    return (
      <div
        className={cn('relative', className)}
        style={{ width: sizeClasses[size].split(' ')[0], height: sizeClasses[size].split(' ')[0] }}
      >
        <div
          className={cn('absolute inset-0 rounded-full border-2 border-border', sizeClasses[size])}
        />
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-transparent border-t-primary',
            'animate-spin',
            sizeClasses[size]
          )}
        />
        <div className="absolute inset-1 rounded-full bg-background/50" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full border-border border-t-primary animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Full-screen loading overlay
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" variant="tactical" />
        {message && <p className="data-label text-muted-foreground animate-pulse">{message}</p>}
      </div>
    </div>
  );
}

// Inline loading indicator
interface LoadingInlineProps {
  message?: string;
  className?: string;
}

export function LoadingInline({ message, className }: LoadingInlineProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Spinner size="sm" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}
