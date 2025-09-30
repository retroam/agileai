import { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    fill?: string;
    tooltip?: string;
  }>;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  showTotal?: boolean;
  totalLabel?: string;
  strokeWidth?: number;
}

export function PieChart({ 
  data,
  innerRadius = 60,
  outerRadius = 80,
  colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'],
  showTotal = true,
  totalLabel = "Total",
  strokeWidth = 5
}: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Calculate total for center label
  const total = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  // Prepare data with fill colors if not provided
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: item.fill || colors[index % colors.length]
    }));
  }, [data, colors]);

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string, entry: any) => {
    // If the data point has a custom tooltip, use that
    if (entry && entry.payload && entry.payload.tooltip) {
      return [entry.payload.tooltip, ''];
    }
    // Otherwise use the default format
    return [`${value}`, name];
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
            strokeWidth={strokeWidth}
          >
            {showTotal && (
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {totalLabel}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            )}
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fill} 
                stroke={entry.fill}
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={customTooltipFormatter}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{
              paddingTop: '1rem',
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
} 