import React from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RadarDataPoint {
  metric: string;
  value: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  height?: number;
  dataKey?: string;
  fill?: string;
}

export function RadarChart({
  data,
  height = 400,
  dataKey = 'value',
  fill = 'hsl(var(--chart-1))'
}: RadarChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{data.metric}</p>
          <p className="text-xs text-muted-foreground">
            Score: {data.value} / {data.fullMark}
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.value / data.fullMark) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={data} margin={{ top: 40, right: 60, bottom: 20, left: 60 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="metric"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 10 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconSize={10}
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Radar
          name="Health Score"
          dataKey={dataKey}
          stroke={fill}
          fill={fill}
          fillOpacity={0.6}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
