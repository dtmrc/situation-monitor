import { Trash2, Save, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { type Factor } from './FactorList';

export interface Evidence {
  id: string;
  text: string;
  source?: string;
  date?: string;
}

export interface FactorDetail extends Factor {
  analysis?: string;
  evidence?: Evidence[];
  sources?: string[];
}

interface FactorEditorProps {
  factor: FactorDetail | null;
  onSave?: (factor: FactorDetail) => void;
  onDelete?: (factor: FactorDetail) => void;
  onAiAnalysis?: (factor: FactorDetail) => void;
}

const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Significant', 'Critical'];

function getImpactColor(impact: number): string {
  if (impact >= 5) return 'text-tactical-red';
  if (impact >= 4) return 'text-orange-500';
  if (impact >= 3) return 'text-tactical-amber';
  return 'text-tactical-green';
}

export function FactorEditor({
  factor,
  onSave,
  onDelete,
  onAiAnalysis,
}: FactorEditorProps) {
  if (!factor) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <p className="text-sm">Select a factor to view or edit details</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">Factor Details</span>
          <div className="flex items-center gap-1 shrink-0">
            {onSave && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onSave(factor)}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-tactical-red hover:text-tactical-red"
                onClick={() => onDelete(factor)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="factor-name" className="text-xs">
            Factor Name
          </Label>
          <Input
            id="factor-name"
            value={factor.name}
            className="h-9"
            readOnly
          />
        </div>

        {/* Impact & Trend */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">
              Impact: <span className={cn('font-bold', getImpactColor(factor.impact))}>
                {impactLabels[factor.impact - 1]} ({factor.impact}/5)
              </span>
            </Label>
            <Slider
              value={[factor.impact]}
              min={1}
              max={5}
              step={1}
              className="mt-2"
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="factor-trend" className="text-xs">
              Trend
            </Label>
            <Select value={factor.trend} disabled>
              <SelectTrigger id="factor-trend" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="improving">Improving ↑</SelectItem>
                <SelectItem value="stable">Stable →</SelectItem>
                <SelectItem value="declining">Declining ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="factor-description" className="text-xs">
            Description
          </Label>
          <Textarea
            id="factor-description"
            value={factor.description || ''}
            className="min-h-[80px] resize-none"
            readOnly
          />
        </div>

        <Separator />

        {/* Analysis with AI Button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="factor-analysis" className="text-xs">
              Analysis
            </Label>
            {onAiAnalysis && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => onAiAnalysis(factor)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AI Assist
              </Button>
            )}
          </div>
          <Textarea
            id="factor-analysis"
            value={factor.analysis || ''}
            placeholder="Add analysis notes..."
            className="min-h-[100px] resize-none"
            readOnly
          />
        </div>

        {/* Evidence */}
        {factor.evidence && factor.evidence.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Evidence</Label>
            <div className="space-y-2">
              {factor.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2 bg-muted/30 rounded-md text-sm"
                >
                  <p>{ev.text}</p>
                  {(ev.source || ev.date) && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {ev.source && <span>Source: {ev.source}</span>}
                      {ev.date && <span>• {ev.date}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {factor.sources && factor.sources.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Sources</Label>
            <div className="flex flex-wrap gap-1">
              {factor.sources.map((source, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
