import React from "react";
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface ScatterChartProps {
  data: Array<{
    x: number;
    y: number;
    name?: string;
  }>;
  xLabel?: string;
  yLabel?: string;
  title?: string;
  color?: string;
}

export function ScatterChart({
  data,
  xLabel = "Comments",
  yLabel = "Days to Close",
  title,
  color = "#3b82f6"
}: ScatterChartProps) {
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
        <RechartsScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name={xLabel} 
            label={{ value: xLabel, position: 'bottom', offset: 5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name={yLabel} 
            label={{ value: yLabel, angle: -90, position: 'left', offset: 10 }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any) => [value, '']}
            labelFormatter={(_, payload: any) => {
              if (payload && payload.length > 0 && payload[0].payload.name) {
                return payload[0].payload.name;
              }
              return '';
            }}
          />
          <Scatter 
            name={title || "Issues"} 
            data={data} 
            fill={color}
          />
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
} 