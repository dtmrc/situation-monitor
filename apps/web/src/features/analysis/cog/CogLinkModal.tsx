import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { type CogElement } from './CogElementList';
import { type CogNodeType } from './CogTree';

interface CogLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceElement: CogElement | null;
  availableElements: CogElement[];
  onSave: (sourceId: string, linkedIds: string[]) => void;
}

const typeConfig: Record<CogNodeType, { label: string; color: string }> = {
  cog: { label: 'CoG', color: 'text-tactical-green' },
  cc: { label: 'CC', color: 'text-tactical-blue' },
  cr: { label: 'CR', color: 'text-tactical-amber' },
  cv: { label: 'CV', color: 'text-tactical-red' },
};

export function CogLinkModal({
  open,
  onOpenChange,
  sourceElement,
  availableElements,
  onSave,
}: CogLinkModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    sourceElement?.linkedIds ?? []
  );

  // Reset selection when source changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && sourceElement) {
      setSelectedIds(sourceElement.linkedIds ?? []);
    }
    onOpenChange(newOpen);
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (sourceElement) {
      onSave(sourceElement.id, selectedIds);
      onOpenChange(false);
    }
  };

  if (!sourceElement) return null;

  // Filter to show only linkable elements based on type hierarchy
  // CoG -> CC, CC -> CR, CR -> CV
  const linkableTypes: CogNodeType[] =
    sourceElement.type === 'cog'
      ? ['cc']
      : sourceElement.type === 'cc'
        ? ['cr']
        : sourceElement.type === 'cr'
          ? ['cv']
          : [];

  const linkableElements = availableElements.filter(
    (e) => linkableTypes.includes(e.type) && e.id !== sourceElement.id
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Elements</DialogTitle>
          <DialogDescription>
            Select elements to link to "{sourceElement.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {linkableElements.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {linkableElements.map((element) => {
                const config = typeConfig[element.type];
                const isSelected = selectedIds.includes(element.id);

                return (
                  <div
                    key={element.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md',
                      'hover:bg-muted/50 cursor-pointer',
                      isSelected && 'bg-primary/10'
                    )}
                    onClick={() => handleToggle(element.id)}
                  >
                    <Checkbox
                      id={element.id}
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(element.id)}
                    />
                    <Label
                      htmlFor={element.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-medium', config.color)}>
                          {config.label}
                        </span>
                        <span className="text-sm">{element.name}</span>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No elements available to link.
              {sourceElement.type === 'cv' &&
                ' Critical Vulnerabilities are the lowest level in the hierarchy.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={linkableElements.length === 0}>
            Save Links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
