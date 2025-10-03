import { ReactElement } from 'react';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface BaseChartProps {
  children: ReactElement;
  data: any[];
  xAxisDataKey: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  className?: string;
}

export function BaseChart({
  children,
  data,
  xAxisDataKey,
  yAxisLabel,
  xAxisLabel,
  height = 400,
  className,
}: BaseChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartGrid() {
  return <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />;
}

export function ChartXAxis({ dataKey, label }: { dataKey: string; label?: string }) {
  return (
    <XAxis
      dataKey={dataKey}
      label={label ? { value: label, position: 'bottom', offset: -5 } : undefined}
      className="text-sm fill-muted-foreground"
      tick={{ fill: 'currentColor' }}
    />
  );
}

export function ChartYAxis({ label }: { label?: string }) {
  return (
    <YAxis
      label={label ? { value: label, angle: -90, position: 'left', offset: 15 } : undefined}
      className="text-sm fill-muted-foreground"
      tick={{ fill: 'currentColor' }}
    />
  );
}

export function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)',
      }}
      labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
    />
  );
}

export function ChartLegend() {
  return (
    <Legend
      wrapperStyle={{
        paddingTop: '1rem',
      }}
      className="text-sm fill-muted-foreground"
    />
  );
} 