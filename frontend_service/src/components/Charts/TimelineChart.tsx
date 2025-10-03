import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface TimelineDataPoint {
  title: string;
  start: number;
  duration: number;
  state: string;
}

interface TimelineChartProps {
  data: TimelineDataPoint[];
  height?: number;
}

export function TimelineChart({ data, height = 400 }: TimelineChartProps) {
  const sortedData = [...data].sort((a, b) => a.duration - b.duration);

  const getColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'hsl(var(--chart-1))'; // Blue
      case 'open':
        return 'hsl(var(--chart-3))'; // Orange/Yellow
      default:
        return 'hsl(var(--chart-2))';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1 max-w-[250px]">{data.title}</p>
          <p className="text-xs text-muted-foreground">
            Duration: {data.duration.toFixed(1)} days
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            Status: {data.state}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 150, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          stroke="hsl(var(--muted-foreground))"
          label={{
            value: 'Days to Close',
            position: 'insideBottom',
            offset: -10,
            style: { fontSize: '12px' }
          }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="title"
          width={140}
          stroke="hsl(var(--muted-foreground))"
          tick={{ fontSize: 10 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconSize={10}
          wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
        />
        <Bar
          dataKey="duration"
          name="Time to Close"
          radius={[0, 4, 4, 0]}
        >
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.state)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
