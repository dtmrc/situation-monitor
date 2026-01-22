import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { type CogNodeType } from './CogTree';

export interface CogElement {
  id: string;
  name: string;
  type: CogNodeType;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  linkedIds?: string[];
}

interface CogElementListProps {
  elements: CogElement[];
  selectedId?: string;
  onSelect: (element: CogElement) => void;
  onAdd?: (type: CogNodeType) => void;
}

const typeConfig: Record<CogNodeType, { label: string; pluralLabel: string; color: string; borderColor: string }> = {
  cog: { label: 'Center of Gravity', pluralLabel: 'Center of Gravity', color: 'text-tactical-green', borderColor: 'border-tactical-green/30' },
  cc: { label: 'Critical Capability', pluralLabel: 'Critical Capabilities', color: 'text-tactical-blue', borderColor: 'border-tactical-blue/30' },
  cr: { label: 'Critical Requirement', pluralLabel: 'Critical Requirements', color: 'text-tactical-amber', borderColor: 'border-tactical-amber/30' },
  cv: { label: 'Critical Vulnerability', pluralLabel: 'Critical Vulnerabilities', color: 'text-tactical-red', borderColor: 'border-tactical-red/30' },
};

const priorityColors = {
  low: 'bg-muted',
  medium: 'bg-tactical-amber/50',
  high: 'bg-tactical-red/50',
};

export function CogElementList({
  elements,
  selectedId,
  onSelect,
  onAdd,
}: CogElementListProps) {
  // Group elements by type
  const cogElement = elements.find((e) => e.type === 'cog');
  const ccElements = elements.filter((e) => e.type === 'cc');
  const crElements = elements.filter((e) => e.type === 'cr');
  const cvElements = elements.filter((e) => e.type === 'cv');

  const renderGroup = (
    type: CogNodeType,
    items: CogElement[],
    showAdd: boolean = true
  ) => {
    const config = typeConfig[type];

    return (
      <div key={type} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-medium', config.color)}>
            {config.pluralLabel}
          </span>
          {showAdd && onAdd && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => onAdd(type)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {items.map((element) => {
          const isSelected = element.id === selectedId;

          return (
            <button
              key={element.id}
              onClick={() => onSelect(element)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md transition-colors',
                'border',
                'hover:bg-secondary',
                isSelected
                  ? `bg-primary/10 ${config.borderColor}`
                  : 'border-transparent'
              )}
            >
              <div className="flex items-center gap-2">
                {element.priority && (
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      priorityColors[element.priority]
                    )}
                  />
                )}
                <span
                  className={cn(
                    'text-sm font-medium truncate flex-1',
                    isSelected && 'text-primary'
                  )}
                >
                  {element.name}
                </span>
                {element.linkedIds && element.linkedIds.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {element.linkedIds.length} links
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2">
            No {config.pluralLabel.toLowerCase()} defined
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Elements</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* CoG (only one) */}
        {cogElement ? (
          <div className="space-y-1.5">
            <span className={cn('text-xs font-medium', typeConfig.cog.color)}>
              Center of Gravity
            </span>
            <button
              onClick={() => onSelect(cogElement)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md transition-colors',
                'border',
                'hover:bg-secondary',
                selectedId === cogElement.id
                  ? 'bg-primary/10 border-tactical-green/30'
                  : 'border-transparent'
              )}
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  selectedId === cogElement.id && 'text-primary'
                )}
              >
                {cogElement.name}
              </span>
            </button>
          </div>
        ) : (
          renderGroup('cog', [], true)
        )}

        {/* Critical Capabilities */}
        {renderGroup('cc', ccElements)}

        {/* Critical Requirements */}
        {renderGroup('cr', crElements)}

        {/* Critical Vulnerabilities */}
        {renderGroup('cv', cvElements)}
      </CardContent>
    </Card>
  );
}
