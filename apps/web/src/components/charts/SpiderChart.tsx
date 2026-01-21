import { useMemo } from 'react';

interface SpiderChartProps {
  data: {
    label: string;
    value: number; // 0-100
  }[];
  color?: string;
  size?: number;
}

export function SpiderChart({ data, color = '#00ff88', size = 200 }: SpiderChartProps) {
  const { points, labels, gridLines } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 30;
    const angleSlice = (Math.PI * 2) / data.length;

    // Data points
    const points = data.map((d, i) => {
      const r = (d.value / 100) * radius;
      const angle = angleSlice * i - Math.PI / 2;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });

    // Axis labels
    const labels = data.map((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const labelRadius = radius + 20;
      return {
        x: cx + labelRadius * Math.cos(angle),
        y: cy + labelRadius * Math.sin(angle),
        text: d.label,
      };
    });

    // Grid circles (20%, 40%, 60%, 80%, 100%)
    const gridLines = [20, 40, 60, 80, 100].map((pct) => ({
      radius: (pct / 100) * radius,
    }));

    return { points, labels, gridLines };
  }, [data, size]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} className="overflow-visible">
      {/* Grid circles */}
      {gridLines.map((g, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={g.radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const angle = ((Math.PI * 2) / data.length) * i - Math.PI / 2;
        const radius = size / 2 - 30;
        return (
          <line
            key={i}
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + radius * Math.cos(angle)}
            y2={size / 2 + radius * Math.sin(angle)}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />
        );
      })}

      {/* Data area */}
      <path d={pathD} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
      ))}

      {/* Labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-muted-foreground"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
