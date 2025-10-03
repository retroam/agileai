import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';

interface FunnelDataPoint {
  stage: string;
  value: number;
  percentage?: number;
}

interface FunnelChartProps {
  data: FunnelDataPoint[];
  height?: number;
}

export function FunnelChart({ data, height = 350 }: FunnelChartProps) {
  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // Calculate percentages relative to first stage
  const maxValue = data[0]?.value || 1;
  const dataWithPercentages = data.map((item) => ({
    ...item,
    percentage: Math.round((item.value / maxValue) * 100),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{data.stage}</p>
          <p className="text-xs text-muted-foreground">
            Count: {data.value}
          </p>
          <p className="text-xs text-muted-foreground">
            Conversion: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value, percentage } = props;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs font-semibold"
      >
        {value} ({percentage}%)
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={dataWithPercentages}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 160, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          stroke="hsl(var(--muted-foreground))"
          label={{
            value: 'Number of Issues',
            position: 'insideBottom',
            offset: -10,
            style: { fontSize: '12px' }
          }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="stage"
          stroke="hsl(var(--muted-foreground))"
          width={150}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          <LabelList dataKey="value" content={renderCustomLabel} />
          {dataWithPercentages.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
