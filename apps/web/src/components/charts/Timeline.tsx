import { useMemo } from 'react';

import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  category?: string;
  color?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  startDate?: Date;
  endDate?: Date;
  onEventClick?: (event: TimelineEvent) => void;
}

const categoryColors: Record<string, string> = {
  assessment: '#00d4ff',
  deadline: '#ff3333',
  milestone: '#00ff88',
  event: '#ffaa00',
  default: '#a855f7',
};

export function Timeline({ events, startDate, endDate, onEventClick }: TimelineProps) {
  const { timeRange, positionedEvents, months } = useMemo(() => {
    if (events.length === 0) {
      return {
        timeRange: { start: new Date(), end: new Date() },
        positionedEvents: [],
        months: [],
      };
    }

    const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
    const start = startDate || sortedEvents[0]?.date || new Date();
    const end = endDate || sortedEvents[sortedEvents.length - 1]?.date || new Date();

    const range = end.getTime() - start.getTime();

    const positionedEvents = sortedEvents.map((event) => ({
      ...event,
      position: ((event.date.getTime() - start.getTime()) / range) * 100,
    }));

    // Generate month markers
    const months: { label: string; position: number }[] = [];
    const current = new Date(start);
    current.setDate(1);
    while (current <= end) {
      const position = ((current.getTime() - start.getTime()) / range) * 100;
      if (position >= 0 && position <= 100) {
        months.push({
          label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          position,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }

    return { timeRange: { start, end }, positionedEvents, months };
  }, [events, startDate, endDate]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground">
        No events to display
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Month labels */}
      <div className="relative h-6 mb-2">
        {months.map((month, i) => (
          <div
            key={i}
            className="absolute text-xs text-muted-foreground"
            style={{ left: `${month.position}%`, transform: 'translateX(-50%)' }}
          >
            {month.label}
          </div>
        ))}
      </div>

      {/* Timeline track */}
      <div className="relative h-2 bg-secondary rounded-full">
        {/* Progress indicator */}
        <div
          className="absolute h-full bg-primary/30 rounded-full"
          style={{
            left: '0%',
            width: `${Math.min(100, ((Date.now() - timeRange.start.getTime()) / (timeRange.end.getTime() - timeRange.start.getTime())) * 100)}%`,
          }}
        />
      </div>

      {/* Events */}
      <div className="relative h-16 mt-2">
        {positionedEvents.map((event) => {
          const color =
            event.color || categoryColors[event.category || 'default'] || categoryColors.default;
          return (
            <div
              key={event.id}
              className="absolute cursor-pointer group"
              style={{ left: `${event.position}%`, transform: 'translateX(-50%)' }}
              onClick={() => onEventClick?.(event)}
            >
              {/* Marker */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full border-2 border-background',
                  'transition-transform group-hover:scale-125'
                )}
                style={{ backgroundColor: color }}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="bg-popover border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-muted-foreground">
                    {event.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
