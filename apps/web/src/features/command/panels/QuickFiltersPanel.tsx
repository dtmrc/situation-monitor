import { ChevronDown, ChevronUp, Filter, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { useMapStore } from '../store';
import type { MarkerType, SeverityLevel } from '../types';

/**
 * QuickFiltersPanel - Floating panel for filtering map markers
 *
 * Position: bottom-right corner (above status bar)
 * Features:
 * - Severity level checkboxes
 * - Marker type checkboxes
 * - Time range selector
 * - Reset filters button
 */

const severityOptions: { value: SeverityLevel; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'low', label: 'Low', color: 'bg-cyan-500' },
  { value: 'info', label: 'Info', color: 'bg-muted-foreground' },
];

const typeOptions: { value: MarkerType; label: string; color: string }[] = [
  { value: 'threat', label: 'Threats', color: 'bg-red-500' },
  { value: 'nai', label: 'NAIs', color: 'bg-primary' },
  { value: 'asset', label: 'Assets', color: 'bg-cyan-500' },
  { value: 'event', label: 'Events', color: 'bg-orange-500' },
  { value: 'infrastructure', label: 'Infrastructure', color: 'bg-blue-500' },
  { value: 'maritime', label: 'Maritime', color: 'bg-blue-500' },
  { value: 'flight', label: 'Flights', color: 'bg-cyan-400' },
  { value: 'alert', label: 'Alerts', color: 'bg-amber-500' },
];

const timeRangeOptions = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: 'all', label: 'All Time' },
] as const;

export function QuickFiltersPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { filters, setFilters, resetFilters } = useMapStore();

  const toggleSeverity = (severity: SeverityLevel) => {
    const current = filters.severities;
    const updated = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    setFilters({ severities: updated });
  };

  const toggleType = (type: MarkerType) => {
    const current = filters.types;
    const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    setFilters({ types: updated });
  };

  const hasActiveFilters =
    filters.severities.length < severityOptions.length ||
    filters.types.length < typeOptions.length ||
    filters.timeRange !== '24h';

  return (
    <div className="absolute bottom-12 right-4 z-[300]">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter
              className={cn('h-4 w-4', hasActiveFilters ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && <div className="w-2 h-2 rounded-full bg-primary" />}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Filter options */}
        {isExpanded && (
          <div className="border-t border-border p-3 space-y-4">
            {/* Severity filters */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Severity
              </div>
              <div className="flex flex-wrap gap-1">
                {severityOptions.map((option) => {
                  const isActive = filters.severities.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleSeverity(option.value)}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors',
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            option.color,
                            !isActive && 'opacity-40'
                          )}
                        />
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type filters */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Type
              </div>
              <div className="flex flex-wrap gap-1">
                {typeOptions.map((option) => {
                  const isActive = filters.types.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleType(option.value)}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors',
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            option.color,
                            !isActive && 'opacity-40'
                          )}
                        />
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time range */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Time Range
              </div>
              <div className="flex flex-wrap gap-1">
                {timeRangeOptions.map((option) => {
                  const isActive = filters.timeRange === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFilters({ timeRange: option.value })}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={resetFilters}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs',
                'border border-border hover:bg-muted/50 transition-colors',
                !hasActiveFilters && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
