import { useState } from 'react';
import { Plus, Filter, Star } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { type ThreatPoint } from './ThreatMatrix';

interface ThreatActorListProps {
  threats: ThreatPoint[];
  selectedId?: string;
  onSelect: (threat: ThreatPoint) => void;
  onAdd?: () => void;
}

const categories = ['All', 'State Actor', 'Non-State', 'Cyber', 'Criminal', 'Insider'];

function getRiskLevel(probability: number, impact: number): { label: string; color: string } {
  const risk = probability * impact;
  if (risk >= 15) return { label: 'CRITICAL', color: 'text-tactical-red' };
  if (risk >= 10) return { label: 'HIGH', color: 'text-orange-500' };
  if (risk >= 5) return { label: 'MEDIUM', color: 'text-tactical-amber' };
  return { label: 'LOW', color: 'text-tactical-green' };
}

export function ThreatActorList({
  threats,
  selectedId,
  onSelect,
  onAdd,
}: ThreatActorListProps) {
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredThreats = threats.filter((threat) => {
    if (categoryFilter !== 'All' && threat.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Sort by risk score (descending)
  const sortedThreats = [...filteredThreats].sort((a, b) => {
    const riskA = a.probability * a.impact;
    const riskB = b.probability * b.impact;
    return riskB - riskA;
  });

  // Group by risk level
  const groupedThreats = {
    critical: sortedThreats.filter((t) => t.probability * t.impact >= 15),
    high: sortedThreats.filter((t) => {
      const risk = t.probability * t.impact;
      return risk >= 10 && risk < 15;
    }),
    medium: sortedThreats.filter((t) => {
      const risk = t.probability * t.impact;
      return risk >= 5 && risk < 10;
    }),
    low: sortedThreats.filter((t) => t.probability * t.impact < 5),
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Threat Actors</span>
          {onAdd && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdd}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Threat list */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {Object.entries(groupedThreats).map(([level, items]) => {
            if (items.length === 0) return null;

            const levelConfig = {
              critical: { label: 'Critical', color: 'text-tactical-red', border: 'border-tactical-red/30' },
              high: { label: 'High', color: 'text-orange-500', border: 'border-orange-500/30' },
              medium: { label: 'Medium', color: 'text-tactical-amber', border: 'border-tactical-amber/30' },
              low: { label: 'Low', color: 'text-tactical-green', border: 'border-tactical-green/30' },
            }[level]!;

            return (
              <div key={level}>
                <div className={cn('text-xs font-medium mb-1', levelConfig.color)}>
                  {levelConfig.label} ({items.length})
                </div>
                <div className="space-y-1">
                  {items.map((threat) => {
                    const isSelected = threat.id === selectedId;
                    const risk = getRiskLevel(threat.probability, threat.impact);

                    return (
                      <button
                        key={threat.id}
                        onClick={() => onSelect(threat)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md transition-colors',
                          'border border-transparent',
                          'hover:bg-secondary',
                          isSelected && 'bg-primary/10 border-primary/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {risk.label === 'CRITICAL' && (
                            <Star className="h-3 w-3 text-tactical-red fill-tactical-red" />
                          )}
                          <span
                            className={cn(
                              'text-sm font-medium truncate flex-1',
                              isSelected && 'text-primary'
                            )}
                          >
                            {threat.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {threat.category}
                          </span>
                          <span className={cn('text-xs font-medium', risk.color)}>
                            {risk.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {sortedThreats.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No threats match the current filter
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
