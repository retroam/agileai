import { Area, AreaChart as RechartsAreaChart } from 'recharts';
import {
  BaseChart,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  ChartLegend,
} from './BaseChart';

interface AreaChartProps {
  data: any[];
  areas: {
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

export function AreaChart({
  data,
  areas,
  xAxisDataKey,
  yAxisLabel,
  xAxisLabel,
  height,
  className,
}: AreaChartProps) {
  return (
    <BaseChart
      data={data}
      xAxisDataKey={xAxisDataKey}
      yAxisLabel={yAxisLabel}
      xAxisLabel={xAxisLabel}
      height={height}
      className={className}
    >
      <RechartsAreaChart data={data}>
        <ChartGrid />
        <ChartXAxis dataKey={xAxisDataKey} label={xAxisLabel} />
        <ChartYAxis label={yAxisLabel} />
        <ChartTooltip />
        <ChartLegend />
        {areas.map((area, index) => {
          const color = area.color || `hsl(${index * 60}, 70%, 50%)`;
          return (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              stackId={area.stackId}
            />
          );
        })}
      </RechartsAreaChart>
    </BaseChart>
  );
} 