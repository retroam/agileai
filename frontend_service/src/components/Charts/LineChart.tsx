import React from 'react';
import { Line, LineChart as RechartsLineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  BaseChart,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
} from './BaseChart';

// New API
interface LineChartNewProps {
  data: any[];
  lines: {
    dataKey: string;
    name: string;
    color?: string;
  }[];
  xAxisDataKey: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  className?: string;
}

// Old API
interface LineChartOldProps {
  data: any[];
  xKey: string;
  yKey?: string;
  series?: string[];
  title?: string;
  colors?: string[];
}

// Combined type
type LineChartProps = LineChartNewProps | LineChartOldProps;

// Type guard to check if props are using the new API
function isNewApi(props: LineChartProps): props is LineChartNewProps {
  return 'lines' in props && 'xAxisDataKey' in props;
}

export function LineChart(props: LineChartProps) {
  // If using the new API
  if (isNewApi(props)) {
    const { data, lines, xAxisDataKey, yAxisLabel, xAxisLabel, height, className } = props;
    
    return (
      <BaseChart
        data={data}
        xAxisDataKey={xAxisDataKey}
        yAxisLabel={yAxisLabel}
        xAxisLabel={xAxisLabel}
        height={height}
        className={className}
      >
        <RechartsLineChart data={data}>
          <ChartGrid />
          <ChartXAxis dataKey={xAxisDataKey} label={xAxisLabel} />
          <ChartYAxis label={yAxisLabel} />
          <ChartTooltip />
          <ChartLegend />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || `hsl(${index * 60}, 70%, 50%)`}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </BaseChart>
    );
  }
  
  // If using the old API
  const { data, xKey, yKey, series, title, colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"] } = props;
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 30
          }}
        >
          <ChartGrid />
          <XAxis 
            dataKey={xKey} 
            tick={{ fontSize: 12 }}
            tickFormatter={(value: any) => {
              // If it's a date string, format it
              if (typeof value === 'string' && value.includes('-')) {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }
              return value;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip />
          <ChartLegend />
          
          {/* If series is provided, render multiple lines */}
          {series ? (
            series.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
              />
            ))
          ) : (
            // Otherwise render a single line
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={colors[0]}
              activeDot={{ r: 6 }}
              strokeWidth={2}
              name={title || yKey}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
} 