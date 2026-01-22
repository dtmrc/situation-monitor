import { ChevronDown, ChevronUp, Layers, Plane, X } from 'lucide-react';
import { useState } from 'react';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import { useMapStore } from '../store';
import type { FlightCategory, LayerId } from '../types';

/**
 * LayerControlPanel - Floating panel for toggling map layers
 *
 * Position: top-left corner
 * Features:
 * - Toggle layer visibility with switches
 * - Adjust layer opacity with sliders
 * - Flight category legend
 * - Collapsible panel
 */

/** Flight category colors matching addMapLayers.ts */
const FLIGHT_CATEGORY_LEGEND: { category: FlightCategory; label: string; color: string }[] = [
  { category: 'commercial', label: 'Commercial', color: '#00d4ff' },
  { category: 'military', label: 'Military', color: '#a855f7' },
  { category: 'emergency', label: 'Emergency', color: '#ff3333' },
  { category: 'private', label: 'Private/GA', color: '#00ff88' },
  { category: 'helicopter', label: 'Helicopter', color: '#ffaa00' },
  { category: 'cargo', label: 'Cargo', color: '#3b82f6' },
  { category: 'uav', label: 'UAV/Drone', color: '#ff6b35' },
];

export function LayerControlPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOpacity, setShowOpacity] = useState<LayerId | null>(null);
  const [showFlightLegend, setShowFlightLegend] = useState(false);

  const { layers, setLayerVisibility, setLayerOpacity } = useMapStore();

  // Filter out basemap (always on) and alerts (always on)
  const controllableLayers = layers.filter((l) => l.id !== 'basemap' && l.id !== 'alerts');

  return (
    <div className="absolute top-4 left-4 z-[300]">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden min-w-[220px]">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Layers</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Layer list */}
        {isExpanded && (
          <div className="border-t border-border">
            {controllableLayers.map((layer) => (
              <div key={layer.id} className="border-b border-border/50 last:border-b-0">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    {/* Color indicator */}
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{layer.name}</span>
                      <span className="text-xs text-muted-foreground">{layer.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Opacity toggle button */}
                    <button
                      onClick={() => setShowOpacity(showOpacity === layer.id ? null : layer.id)}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        'hover:bg-muted/50 transition-colors',
                        showOpacity === layer.id && 'bg-muted'
                      )}
                    >
                      {Math.round(layer.opacity * 100)}%
                    </button>

                    {/* Visibility switch */}
                    <Switch
                      checked={layer.visible}
                      onCheckedChange={(checked) => setLayerVisibility(layer.id, checked)}
                    />
                  </div>
                </div>

                {/* Opacity slider (expanded) */}
                {showOpacity === layer.id && (
                  <div className="px-3 pb-2 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-12">Opacity</span>
                      <Slider
                        value={[layer.opacity * 100]}
                        onValueChange={(values) =>
                          setLayerOpacity(layer.id, (values[0] ?? 100) / 100)
                        }
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <button
                        onClick={() => setShowOpacity(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Flight category legend (for flight layer only) */}
                {layer.id === 'flight' && layer.visible && (
                  <div className="px-3 pb-2">
                    <button
                      onClick={() => setShowFlightLegend(!showFlightLegend)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plane className="h-3 w-3" />
                      <span>Aircraft Types</span>
                      {showFlightLegend ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {showFlightLegend && (
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        {FLIGHT_CATEGORY_LEGEND.map(({ category, label, color }) => (
                          <div key={category} className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                category === 'emergency' && 'ring-2 ring-red-500/50 animate-pulse'
                              )}
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
