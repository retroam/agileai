import { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer
} from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './chart';

interface ChartDataItem {
  [key: string]: any;
  name: string;
  value: number;
  fill?: string;
}

interface DonutChartProps {
  data: ChartDataItem[];
  nameKey?: string;
  valueKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  showTotal?: boolean;
  totalLabel?: string;
  strokeWidth?: number;
  className?: string;
  config?: ChartConfig;
}

export function DonutChart({ 
  data,
  nameKey = "name",
  valueKey = "value",
  innerRadius = 60,
  outerRadius = 80,
  showTotal = true,
  totalLabel = "Total",
  strokeWidth = 5,
  className = "h-[300px]",
  config
}: DonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Calculate total for center label
  const total = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr[valueKey], 0);
  }, [data, valueKey]);

  // Generate config if not provided
  const chartConfig = useMemo(() => {
    if (config) return config;
    
    const defaultColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))'
    ];
    
    return data.reduce((acc, item, index) => {
      const key = String(item[nameKey]);
      acc[key] = {
        label: String(item[nameKey]),
        color: item.fill || defaultColors[index % defaultColors.length]
      };
      return acc;
    }, {} as ChartConfig);
  }, [config, data, nameKey]);

  return (
    <ChartContainer config={chartConfig} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey={nameKey} />} />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey={valueKey}
            nameKey={nameKey}
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
            {data.map((entry, index) => {
              const key = String(entry[nameKey]);
              const color = chartConfig[key]?.color || `hsl(var(--chart-${index + 1}))`;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={color}
                  stroke={color}
                />
              );
            })}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
} 