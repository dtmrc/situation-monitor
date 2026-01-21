import { Link2, Calendar, TrendingUp, TrendingDown, Minus, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RelationshipDetail {
  id: string;
  sourceEntity: {
    id: string;
    name: string;
    type: 'nation' | 'organization' | 'actor';
  };
  targetEntity: {
    id: string;
    name: string;
    type: 'nation' | 'organization' | 'actor';
  };
  type: 'alliance' | 'trade' | 'rivalry' | 'dependency';
  strength: number; // 1-5
  trend: 'improving' | 'stable' | 'deteriorating';
  establishedDate?: Date;
  description?: string;
  keyAgreements?: string[];
  recentEvents?: {
    date: Date;
    description: string;
  }[];
}

interface RelationshipDetailPanelProps {
  relationship: RelationshipDetail | null;
  onClose?: () => void;
}

const typeLabels: Record<RelationshipDetail['type'], { label: string; color: string }> = {
  alliance: {
    label: 'Alliance',
    color: 'bg-tactical-green/20 text-tactical-green border-tactical-green/30',
  },
  trade: {
    label: 'Trade',
    color: 'bg-tactical-blue/20 text-tactical-blue border-tactical-blue/30',
  },
  rivalry: {
    label: 'Rivalry',
    color: 'bg-tactical-red/20 text-tactical-red border-tactical-red/30',
  },
  dependency: {
    label: 'Dependency',
    color: 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30',
  },
};

const TrendIcon = ({ trend }: { trend: RelationshipDetail['trend'] }) => {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-tactical-green" />;
    case 'deteriorating':
      return <TrendingDown className="w-4 h-4 text-tactical-red" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
};

export function RelationshipDetailPanel({ relationship, onClose }: RelationshipDetailPanelProps) {
  if (!relationship) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Relationship Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a node or link from the network graph to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  const { label, color } = typeLabels[relationship.type];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Relationship Details
          </span>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ×
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
        {/* Entities */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{relationship.sourceEntity.name}</span>
          <span className="text-muted-foreground">↔</span>
          <span className="font-medium">{relationship.targetEntity.name}</span>
        </div>

        {/* Type and Strength */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(color)}>
            {label}
          </Badge>
          <div className="flex items-center gap-1">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full',
                    i < relationship.strength ? 'bg-primary' : 'bg-secondary'
                  )}
                />
              ))}
            <span className="text-xs text-muted-foreground ml-1">{relationship.strength}/5</span>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-2 text-sm">
          <TrendIcon trend={relationship.trend} />
          <span className="capitalize">{relationship.trend}</span>
        </div>

        {/* Established Date */}
        {relationship.establishedDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              Established{' '}
              {relationship.establishedDate.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Description */}
        {relationship.description && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Description
            </h4>
            <p className="text-sm">{relationship.description}</p>
          </div>
        )}

        {/* Key Agreements */}
        {relationship.keyAgreements && relationship.keyAgreements.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Key Agreements
            </h4>
            <ul className="space-y-1">
              {relationship.keyAgreements.map((agreement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <FileText className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  {agreement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Events */}
        {relationship.recentEvents && relationship.recentEvents.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent Events
            </h4>
            <ul className="space-y-2">
              {relationship.recentEvents.map((event, i) => (
                <li key={i} className="text-sm">
                  <span className="text-xs text-muted-foreground">
                    {event.date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <p>{event.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
