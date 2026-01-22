import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type DataPoint } from '@/components/charts';
import {
  TrendChart,
  IndicatorList,
  TrendSummary,
  getDateRange,
  type TimeRange,
  type TrendIndicator,
  type IndicatorSummary,
} from '@/features/analysis/trend';

export const Route = createFileRoute('/_app/analysis/trends')({
  component: TrendAnalysisPage,
});

// Generate mock time series data
function generateMockData(
  months: number,
  baseValue: number,
  volatility: number,
  trend: number
): DataPoint[] {
  const data: DataPoint[] = [];
  const now = new Date();
  let value = baseValue;

  for (let i = months * 4; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7); // Weekly data points

    // Add some randomness and trend
    const noise = (Math.random() - 0.5) * volatility;
    value = value + trend + noise;
    value = Math.max(0, Math.min(100, value)); // Clamp between 0-100

    data.push({ x: date, y: Math.round(value * 10) / 10 });
  }

  return data;
}

// Mock indicator data
const mockIndicators: (TrendIndicator & Omit<IndicatorSummary, 'id' | 'name' | 'color'>)[] = [
  {
    id: 'economic',
    name: 'Economic Index',
    color: '#00ff88',
    data: generateMockData(12, 65, 8, 0.3),
    currentValue: 72,
    change: 8.3,
    trend: 'improving',
  },
  {
    id: 'political',
    name: 'Political Stability',
    color: '#00d4ff',
    data: generateMockData(12, 60, 12, -0.4),
    currentValue: 45,
    change: -15.2,
    trend: 'declining',
  },
  {
    id: 'security',
    name: 'Security Index',
    color: '#ffaa00',
    data: generateMockData(12, 70, 6, 0.1),
    currentValue: 68,
    change: 2.1,
    trend: 'stable',
  },
  {
    id: 'social',
    name: 'Social Cohesion',
    color: '#a855f7',
    data: generateMockData(12, 55, 10, -0.2),
    currentValue: 52,
    change: -5.4,
    trend: 'declining',
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Health',
    color: '#f97316',
    data: generateMockData(12, 75, 4, 0.05),
    currentValue: 76,
    change: 1.3,
    trend: 'stable',
  },
  {
    id: 'info',
    name: 'Information Integrity',
    color: '#ec4899',
    data: generateMockData(12, 50, 15, -0.3),
    currentValue: 42,
    change: -12.0,
    trend: 'declining',
  },
  {
    id: 'trade',
    name: 'Trade Balance',
    color: '#14b8a6',
    data: generateMockData(12, 60, 8, 0.2),
    currentValue: 64,
    change: 4.5,
    trend: 'improving',
  },
  {
    id: 'confidence',
    name: 'Public Confidence',
    color: '#8b5cf6',
    data: generateMockData(12, 58, 10, 0.15),
    currentValue: 61,
    change: 3.2,
    trend: 'improving',
  },
];

function TrendAnalysisPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorSummary | null>(null);

  // Filter data based on time range
  const filteredIndicators = useMemo(() => {
    const { start } = getDateRange(timeRange);

    return mockIndicators.map((ind) => ({
      ...ind,
      data: ind.data.filter((d) => d.x >= start),
    }));
  }, [timeRange]);

  // Create summary list
  const indicatorSummaries: IndicatorSummary[] = mockIndicators.map((ind) => ({
    id: ind.id,
    name: ind.name,
    color: ind.color,
    currentValue: ind.currentValue,
    change: ind.change,
    trend: ind.trend,
  }));

  // Get chart data - either selected indicator or all
  const chartIndicators = selectedIndicator
    ? filteredIndicators.filter((i) => i.id === selectedIndicator.id)
    : filteredIndicators;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trend Analysis</h1>
          <p className="text-muted-foreground">
            Track indicators and metrics over time to identify patterns
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Indicator
        </Button>
      </div>

      {/* Main Chart */}
      <TrendChart
        indicators={chartIndicators}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        title={
          selectedIndicator
            ? `${selectedIndicator.name} Trend`
            : 'Multi-Series Trend Chart'
        }
      />

      {/* Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Indicator List */}
        <IndicatorList
          indicators={indicatorSummaries}
          selectedId={selectedIndicator?.id}
          onSelect={(ind) => {
            // Toggle selection
            if (selectedIndicator?.id === ind.id) {
              setSelectedIndicator(null);
            } else {
              setSelectedIndicator(ind);
            }
          }}
        />

        {/* Trend Summary */}
        <TrendSummary indicators={indicatorSummaries} />
      </div>
    </div>
  );
}
