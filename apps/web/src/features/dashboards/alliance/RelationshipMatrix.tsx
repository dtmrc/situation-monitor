import { Grid } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Relationship {
  sourceId: string;
  targetId: string;
  type: 'alliance' | 'trade' | 'rivalry' | 'dependency' | 'neutral';
  strength: number; // 1-5
}

export interface Entity {
  id: string;
  name: string;
  shortName?: string;
}

interface RelationshipMatrixProps {
  entities: Entity[];
  relationships: Relationship[];
  onCellClick?: (sourceId: string, targetId: string) => void;
}

const relationshipColors: Record<Relationship['type'], string> = {
  alliance: 'bg-tactical-green',
  trade: 'bg-tactical-blue',
  rivalry: 'bg-tactical-red',
  dependency: 'bg-tactical-amber',
  neutral: 'bg-muted',
};

export function RelationshipMatrix({
  entities,
  relationships,
  onCellClick,
}: RelationshipMatrixProps) {
  // Build a lookup map for relationships
  const relationshipMap = useMemo(() => {
    const map = new Map<string, Relationship>();
    relationships.forEach((r) => {
      map.set(`${r.sourceId}-${r.targetId}`, r);
      // Also set reverse for undirected relationships
      if (r.type !== 'dependency') {
        map.set(`${r.targetId}-${r.sourceId}`, r);
      }
    });
    return map;
  }, [relationships]);

  const getRelationship = (sourceId: string, targetId: string) => {
    return relationshipMap.get(`${sourceId}-${targetId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Grid className="h-4 w-4" />
          Relationship Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entities to display</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-1" />
                  {entities.map((entity) => (
                    <th
                      key={entity.id}
                      className="p-1 text-muted-foreground font-normal writing-mode-vertical"
                      style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                    >
                      {entity.shortName || entity.name.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entities.map((rowEntity) => (
                  <tr key={rowEntity.id}>
                    <td className="p-1 text-muted-foreground text-right pr-2">
                      {rowEntity.shortName || rowEntity.name.slice(0, 3)}
                    </td>
                    {entities.map((colEntity) => {
                      const rel = getRelationship(rowEntity.id, colEntity.id);
                      const isSelf = rowEntity.id === colEntity.id;

                      return (
                        <td key={colEntity.id} className="p-0.5">
                          <button
                            className={cn(
                              'w-6 h-6 rounded-sm flex items-center justify-center',
                              'transition-all hover:scale-110',
                              isSelf
                                ? 'bg-secondary cursor-default'
                                : rel
                                  ? relationshipColors[rel.type]
                                  : 'bg-card border border-border hover:border-primary cursor-pointer'
                            )}
                            onClick={() => !isSelf && onCellClick?.(rowEntity.id, colEntity.id)}
                            disabled={isSelf}
                          >
                            {rel && !isSelf && (
                              <span className="text-[10px] font-mono text-foreground/80">
                                {rel.strength}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              {Object.entries(relationshipColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={cn('w-3 h-3 rounded-sm', color)} />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
