import { CheckSquare, Plus, Square, CheckSquare2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ActionItem {
  id: string;
  content: string;
  completed: boolean;
  assignee?: string;
  dueDate?: Date;
}

interface ActionItemsProps {
  items: ActionItem[];
  onAddItem?: (content: string) => void;
  onToggleItem?: (id: string) => void;
  readOnly?: boolean;
}

export function ActionItems({
  items,
  onAddItem,
  onToggleItem,
  readOnly = false,
}: ActionItemsProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim() && onAddItem) {
      onAddItem(newItem.trim());
      setNewItem('');
    }
  };

  const completedCount = items.filter((i) => i.completed).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Recommended Actions
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length} complete
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new item */}
        {!readOnly && onAddItem && (
          <div className="flex gap-2">
            <Input
              placeholder="Add action item..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Items list */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No action items. Add recommended actions to track implementation.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-start gap-2 p-2 rounded hover:bg-secondary transition-colors',
                  item.completed && 'opacity-60'
                )}
              >
                <button
                  className="mt-0.5 shrink-0"
                  onClick={() => onToggleItem?.(item.id)}
                  disabled={readOnly}
                >
                  {item.completed ? (
                    <CheckSquare2 className="h-4 w-4 text-tactical-green" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm',
                      item.completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {item.content}
                  </p>
                  {(item.assignee || item.dueDate) && (
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {item.assignee && <span>@{item.assignee}</span>}
                      {item.dueDate && (
                        <span>
                          Due{' '}
                          {item.dueDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
