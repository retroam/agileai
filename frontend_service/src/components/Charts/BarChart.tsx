import React from 'react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  BaseChart,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
} from './BaseChart';

// New API
interface BarChartNewProps {
  data: any[];
  bars: {
    dataKey: string;
    name: string;
    color?: string;
    stackId?: string;
  }[];
  xAxisDataKey: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  className?: string;
}

// Old API
interface BarChartOldProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  layout?: "vertical" | "horizontal";
}

// Combined type
type BarChartProps = BarChartNewProps | BarChartOldProps;

// Type guard to check if props are using the new API
function isNewApi(props: BarChartProps): props is BarChartNewProps {
  return 'bars' in props && 'xAxisDataKey' in props;
}

export function BarChart(props: BarChartProps) {
  // If using the new API
  if (isNewApi(props)) {
    const { data, bars, xAxisDataKey, yAxisLabel, xAxisLabel, height, className } = props;
    
    return (
      <BaseChart
        data={data}
        xAxisDataKey={xAxisDataKey}
        yAxisLabel={yAxisLabel}
        xAxisLabel={xAxisLabel}
        height={height}
        className={className}
      >
        <RechartsBarChart data={data}>
          <ChartGrid />
          <ChartXAxis dataKey={xAxisDataKey} label={xAxisLabel} />
          <ChartYAxis label={yAxisLabel} />
          <ChartTooltip />
          <ChartLegend />
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || `hsl(${index * 60}, 70%, 50%)`}
              stackId={bar.stackId}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </BaseChart>
    );
  }
  
  // If using the old API
  const { data, xKey, yKey, title, color = "#3b82f6", layout = "vertical" } = props;
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // For horizontal layout, we need to swap axes
  const isHorizontal = layout === "horizontal";
  
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{
            top: 10,
            right: 30,
            left: isHorizontal ? 80 : 20, // More space for labels in horizontal layout
            bottom: 30
          }}
        >
          <ChartGrid />
          
          {isHorizontal ? (
            // Horizontal layout (vertical bars)
            <>
              <YAxis 
                dataKey={xKey} 
                type="category" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <XAxis type="number" tick={{ fontSize: 12 }} />
            </>
          ) : (
            // Vertical layout (horizontal bars)
            <>
              <XAxis 
                dataKey={xKey} 
                tick={{ fontSize: 12 }}
                tickFormatter={(value: any) => {
                  // Truncate long labels
                  if (typeof value === 'string' && value.length > 10) {
                    return value.substring(0, 10) + '...';
                  }
                  return value;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
            </>
          )}
          
          <ChartTooltip />
          <ChartLegend />
          <Bar 
            dataKey={yKey} 
            fill={color} 
            name={title || yKey}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
} 