import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, type LineSeries, type DataPoint } from '@/components/charts';

import { TimeRangeSelector, type TimeRange } from './TimeRangeSelector';

export interface TrendIndicator {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
}

interface TrendChartProps {
  indicators: TrendIndicator[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onPointClick?: (indicatorId: string, point: DataPoint) => void;
  title?: string;
}

export function TrendChart({
  indicators,
  timeRange,
  onTimeRangeChange,
  onPointClick,
  title = 'Multi-Series Trend Chart',
}: TrendChartProps) {
  // Convert to LineSeries format
  const series: LineSeries[] = indicators.map((ind) => ({
    id: ind.id,
    name: ind.name,
    color: ind.color,
    data: ind.data,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart
          series={series}
          height={350}
          showLegend={true}
          showGrid={true}
          onPointClick={onPointClick}
        />
      </CardContent>
    </Card>
  );
}
