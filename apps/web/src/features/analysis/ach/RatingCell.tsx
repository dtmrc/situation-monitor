import { cn } from '@/lib/utils';

export type Rating = '++' | '+' | 'N' | '-' | '--';

interface RatingCellProps {
  rating: Rating;
  onChange: (rating: Rating) => void;
  disabled?: boolean;
}

const ratingOptions: Rating[] = ['++', '+', 'N', '-', '--'];

const ratingConfig: Record<Rating, { bg: string; text: string; label: string }> = {
  '++': { bg: 'bg-tactical-green/60', text: 'text-tactical-green', label: 'Strongly Supports' },
  '+': { bg: 'bg-tactical-green/30', text: 'text-tactical-green', label: 'Supports' },
  'N': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Neutral' },
  '-': { bg: 'bg-tactical-red/30', text: 'text-tactical-red', label: 'Contradicts' },
  '--': { bg: 'bg-tactical-red/60', text: 'text-tactical-red', label: 'Strongly Contradicts' },
};

export function RatingCell({ rating, onChange, disabled }: RatingCellProps) {
  const config = ratingConfig[rating];

  return (
    <select
      value={rating}
      onChange={(e) => onChange(e.target.value as Rating)}
      disabled={disabled}
      className={cn(
        'w-14 h-8 rounded text-center font-bold cursor-pointer border-0 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary',
        config.bg,
        config.text,
        disabled && 'cursor-not-allowed opacity-50'
      )}
      title={config.label}
    >
      {ratingOptions.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function RatingLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="text-muted-foreground">Legend:</span>
      {ratingOptions.map((rating) => {
        const config = ratingConfig[rating];
        return (
          <div key={rating} className="flex items-center gap-1">
            <div className={cn('w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold', config.bg, config.text)}>
              {rating}
            </div>
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
