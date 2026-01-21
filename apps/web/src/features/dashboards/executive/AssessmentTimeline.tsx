import { Calendar } from 'lucide-react';

import type { TimelineEvent } from '@/components/charts';
import { Timeline } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Assessment {
  id: string;
  name: string;
  type: 'pmesii' | 'threat' | 'cog' | 'strategic';
  date: Date;
  status: 'completed' | 'in_progress' | 'scheduled';
}

interface AssessmentTimelineProps {
  assessments: Assessment[];
  onAssessmentClick?: (assessment: Assessment) => void;
}

const typeColors: Record<Assessment['type'], string> = {
  pmesii: '#00d4ff',
  threat: '#ff3333',
  cog: '#ffaa00',
  strategic: '#00ff88',
};

export function AssessmentTimeline({ assessments, onAssessmentClick }: AssessmentTimelineProps) {
  const events: TimelineEvent[] = assessments.map((a) => ({
    id: a.id,
    title: a.name,
    date: a.date,
    category: a.type,
    color: typeColors[a.type],
  }));

  const handleEventClick = (event: TimelineEvent) => {
    const assessment = assessments.find((a) => a.id === event.id);
    if (assessment && onAssessmentClick) {
      onAssessmentClick(assessment);
    }
  };

  // Calculate date range: 30 days before and after today
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 60);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Assessment Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessments scheduled</p>
        ) : (
          <>
            <Timeline
              events={events}
              startDate={startDate}
              endDate={endDate}
              onEventClick={handleEventClick}
            />
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: typeColors.pmesii }}
                />
                PMESII-PT
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: typeColors.threat }}
                />
                Threat
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors.cog }} />
                CoG
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: typeColors.strategic }}
                />
                Strategic
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
