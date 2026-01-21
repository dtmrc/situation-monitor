import { Calendar, Vote, AlertTriangle, Flag, Handshake } from 'lucide-react';

import type { TimelineEvent } from '@/components/charts';
import { Timeline } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface PoliticalEvent {
  id: string;
  title: string;
  date: Date;
  type: 'election' | 'coup' | 'transition' | 'treaty' | 'protest' | 'other';
  description?: string;
}

interface PoliticalEventsTimelineProps {
  events: PoliticalEvent[];
  onEventClick?: (event: PoliticalEvent) => void;
}

const eventColors: Record<PoliticalEvent['type'], string> = {
  election: '#00d4ff',
  coup: '#ff3333',
  transition: '#ffaa00',
  treaty: '#00ff88',
  protest: '#a855f7',
  other: '#737373',
};

const eventIcons: Record<PoliticalEvent['type'], React.ComponentType<{ className?: string }>> = {
  election: Vote,
  coup: AlertTriangle,
  transition: Flag,
  treaty: Handshake,
  protest: AlertTriangle,
  other: Calendar,
};

export function PoliticalEventsTimeline({ events, onEventClick }: PoliticalEventsTimelineProps) {
  const timelineEvents: TimelineEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    category: e.type,
    color: eventColors[e.type],
  }));

  const handleEventClick = (event: TimelineEvent) => {
    const politicalEvent = events.find((e) => e.id === event.id);
    if (politicalEvent && onEventClick) {
      onEventClick(politicalEvent);
    }
  };

  // Calculate date range: 5 years back, 1 year forward
  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - 5);
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Political Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No political events recorded</p>
        ) : (
          <>
            <Timeline
              events={timelineEvents}
              startDate={startDate}
              endDate={endDate}
              onEventClick={handleEventClick}
            />
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              {Object.entries(eventColors).map(([type, color]) => {
                const Icon = eventIcons[type as PoliticalEvent['type']];
                return (
                  <div
                    key={type}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span style={{ color }}>
                      <Icon className="w-3 h-3" />
                    </span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
