import { cn } from '@/lib/utils';

export type PmesiiDomain = 'P1' | 'M' | 'E' | 'S' | 'I1' | 'I2' | 'P2' | 'T';

export interface DomainInfo {
  code: PmesiiDomain;
  letter: string;
  name: string;
  description: string;
  color: string;
}

export const DOMAINS: DomainInfo[] = [
  { code: 'P1', letter: 'P', name: 'Political', description: 'Governance, policy, political stability', color: 'bg-blue-500' },
  { code: 'M', letter: 'M', name: 'Military', description: 'Armed forces, security, defense posture', color: 'bg-red-500' },
  { code: 'E', letter: 'E', name: 'Economic', description: 'Markets, trade, financial systems', color: 'bg-green-500' },
  { code: 'S', letter: 'S', name: 'Social', description: 'Demographics, culture, civil society', color: 'bg-purple-500' },
  { code: 'I1', letter: 'I', name: 'Information', description: 'Media, cyber, information operations', color: 'bg-cyan-500' },
  { code: 'I2', letter: 'I', name: 'Infrastructure', description: 'Critical systems, utilities, transport', color: 'bg-orange-500' },
  { code: 'P2', letter: 'P', name: 'Physical', description: 'Geography, climate, natural resources', color: 'bg-emerald-500' },
  { code: 'T', letter: 'T', name: 'Time', description: 'Temporal factors, deadlines, windows', color: 'bg-pink-500' },
];

interface DomainTabsProps {
  selectedDomain: PmesiiDomain;
  onSelectDomain: (domain: PmesiiDomain) => void;
  domainScores?: Record<PmesiiDomain, number>; // Optional impact scores for visual indicators
}

export function DomainTabs({ selectedDomain, onSelectDomain, domainScores }: DomainTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
      {DOMAINS.map((domain) => {
        const isSelected = selectedDomain === domain.code;
        const score = domainScores?.[domain.code];

        return (
          <button
            key={domain.code}
            onClick={() => onSelectDomain(domain.code)}
            className={cn(
              'relative flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all',
              'hover:bg-secondary',
              isSelected && 'bg-primary/10 ring-1 ring-primary'
            )}
            title={`${domain.name}: ${domain.description}`}
          >
            {/* Domain letter with color indicator */}
            <div className="flex items-center gap-1">
              <div className={cn('w-1.5 h-1.5 rounded-full', domain.color)} />
              <span
                className={cn(
                  'text-sm font-bold font-mono',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {domain.letter}
              </span>
            </div>

            {/* Domain name (shown on larger screens) */}
            <span
              className={cn(
                'text-[10px] hidden md:block mt-0.5',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {domain.name}
            </span>

            {/* Score indicator if provided */}
            {score !== undefined && (
              <div
                className={cn(
                  'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center',
                  score >= 4
                    ? 'bg-tactical-red text-white'
                    : score >= 3
                      ? 'bg-tactical-amber text-black'
                      : 'bg-tactical-green text-black'
                )}
              >
                {score}
              </div>
            )}

            {/* Selected indicator line */}
            {isSelected && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
