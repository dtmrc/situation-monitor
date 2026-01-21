import { User, Calendar, Building, Flag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PoliticalActor {
  id: string;
  name: string;
  title: string;
  party?: string;
  photo?: string;
  birthDate?: Date;
  inOfficeSince?: Date;
  biography?: string;
  affiliations: string[];
  keyPositions: string[];
  influence: 'high' | 'medium' | 'low';
}

interface ActorProfileProps {
  actor: PoliticalActor | null;
  onClose?: () => void;
}

const influenceColors: Record<PoliticalActor['influence'], string> = {
  high: 'bg-tactical-red/20 text-tactical-red border-tactical-red/30',
  medium: 'bg-tactical-amber/20 text-tactical-amber border-tactical-amber/30',
  low: 'bg-tactical-green/20 text-tactical-green border-tactical-green/30',
};

export function ActorProfile({ actor, onClose }: ActorProfileProps) {
  if (!actor) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Actor Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select an actor from the org chart to view their profile
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Actor Profile
          </span>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ×
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
        {/* Header with photo */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            {actor.photo ? (
              <img
                src={actor.photo}
                alt={actor.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{actor.name}</h3>
            <p className="text-sm text-muted-foreground">{actor.title}</p>
            <Badge variant="outline" className={cn('mt-1', influenceColors[actor.influence])}>
              {actor.influence} influence
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {actor.party && (
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-muted-foreground" />
              <span>{actor.party}</span>
            </div>
          )}
          {actor.inOfficeSince && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                In office since{' '}
                {actor.inOfficeSince.toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Biography */}
        {actor.biography && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Biography
            </h4>
            <p className="text-sm">{actor.biography}</p>
          </div>
        )}

        {/* Affiliations */}
        {actor.affiliations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Affiliations
            </h4>
            <div className="flex flex-wrap gap-1">
              {actor.affiliations.map((aff, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {aff}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Key Positions */}
        {actor.keyPositions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Key Positions
            </h4>
            <ul className="space-y-1">
              {actor.keyPositions.map((pos, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Building className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  {pos}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
