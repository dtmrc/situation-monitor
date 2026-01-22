import { Edit2, Trash2, Link2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { type CogElement } from './CogElementList';
import { type CogNodeType } from './CogTree';

interface CogElementDetailProps {
  element: CogElement | null;
  allElements: CogElement[];
  onEdit?: (element: CogElement) => void;
  onDelete?: (element: CogElement) => void;
  onLink?: (element: CogElement) => void;
}

const typeConfig: Record<CogNodeType, { label: string; color: string; bgColor: string }> = {
  cog: { label: 'Center of Gravity', color: 'text-tactical-green', bgColor: 'bg-tactical-green/20' },
  cc: { label: 'Critical Capability', color: 'text-tactical-blue', bgColor: 'bg-tactical-blue/20' },
  cr: { label: 'Critical Requirement', color: 'text-tactical-amber', bgColor: 'bg-tactical-amber/20' },
  cv: { label: 'Critical Vulnerability', color: 'text-tactical-red', bgColor: 'bg-tactical-red/20' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-tactical-amber' },
  high: { label: 'High', color: 'text-tactical-red' },
};

export function CogElementDetail({
  element,
  allElements,
  onEdit,
  onDelete,
  onLink,
}: CogElementDetailProps) {
  if (!element) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <p className="text-sm">Select an element to view details</p>
        </CardContent>
      </Card>
    );
  }

  const config = typeConfig[element.type];
  const linkedElements = element.linkedIds
    ? allElements.filter((e) => element.linkedIds?.includes(e.id))
    : [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">{element.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            {onLink && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onLink(element)}
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Link
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(element)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && element.type !== 'cog' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-tactical-red hover:text-tactical-red"
                onClick={() => onDelete(element)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Type Badge */}
        <div className="flex items-center gap-2">
          <Badge className={cn(config.bgColor, config.color, 'border-0')}>
            {config.label}
          </Badge>
          {element.priority && (
            <Badge variant="outline" className={priorityConfig[element.priority].color}>
              {priorityConfig[element.priority].label} Priority
            </Badge>
          )}
        </div>

        {/* Description */}
        {element.description && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Description</div>
            <p className="text-sm">{element.description}</p>
          </div>
        )}

        <Separator />

        {/* Linked Elements */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            Linked {element.type === 'cc' ? 'Requirements' : element.type === 'cr' ? 'Vulnerabilities' : 'Elements'}
          </div>
          {linkedElements.length > 0 ? (
            <div className="space-y-1.5">
              {linkedElements.map((linked) => {
                const linkedConfig = typeConfig[linked.type];
                return (
                  <div
                    key={linked.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md',
                      'bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        linkedConfig.bgColor.replace('/20', '')
                      )}
                    />
                    <span className="text-sm flex-1 truncate">{linked.name}</span>
                    <span className={cn('text-xs', linkedConfig.color)}>
                      {linked.type.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No linked elements</p>
          )}
        </div>

        {/* Type-specific guidance */}
        <Separator />
        <div className="bg-muted/20 rounded-md p-3">
          <div className="text-xs font-medium mb-1">{config.label} Guidance</div>
          <p className="text-xs text-muted-foreground">
            {element.type === 'cog' &&
              'The Center of Gravity is the source of power that provides moral or physical strength, freedom of action, or will to act.'}
            {element.type === 'cc' &&
              'Critical Capabilities are the primary abilities that enable the CoG to function. What can the CoG do?'}
            {element.type === 'cr' &&
              'Critical Requirements are the essential conditions, resources, or means the CoG needs to function. What does the CoG need?'}
            {element.type === 'cv' &&
              'Critical Vulnerabilities are aspects of Critical Requirements that are deficient or susceptible to attack.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
