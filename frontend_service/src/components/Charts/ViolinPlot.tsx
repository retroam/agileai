import React from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ViolinDataPoint {
  category: string;
  values: number[];
}

interface ViolinPlotProps {
  data: ViolinDataPoint[];
  height?: number;
}

// Calculate kernel density estimation for smooth distribution
function kernelDensityEstimator(values: number[], bandwidth: number = 5) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const numPoints = 50;
  const step = range / numPoints;

  const points: { x: number; density: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = min + i * step;
    let density = 0;

    // Gaussian kernel
    for (const value of values) {
      const diff = (x - value) / bandwidth;
      density += Math.exp(-0.5 * diff * diff);
    }

    density = density / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    points.push({ x, density });
  }

  return points;
}

export function ViolinPlot({ data, height = 400 }: ViolinPlotProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No distribution data available
      </div>
    );
  }

  // Process data for violin plot
  const chartData: any[] = [];
  const categories = data.map(d => d.category);

  // Calculate KDE for each category
  const distributions = data.map(d => ({
    category: d.category,
    kde: kernelDensityEstimator(d.values.filter(v => v != null && !isNaN(v)))
  }));

  // Find max density for scaling
  const maxDensity = Math.max(...distributions.flatMap(d => d.kde.map(p => p.density)));

  // Create data points for the chart
  const maxPoints = Math.max(...distributions.map(d => d.kde.length));

  for (let i = 0; i < maxPoints; i++) {
    const point: any = { index: i };

    distributions.forEach((dist, idx) => {
      if (i < dist.kde.length) {
        const kde = dist.kde[i];
        // Scale density to fit nicely (0 to 0.4 for each side)
        const scaledDensity = (kde.density / maxDensity) * 0.4;
        point[`${dist.category}_value`] = kde.x;
        point[`${dist.category}_left`] = idx - scaledDensity;
        point[`${dist.category}_right`] = idx + scaledDensity;
      }
    });

    chartData.push(point);
  }

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          {payload.map((entry: any, index: number) => {
            const category = entry.dataKey.replace('_left', '').replace('_right', '');
            const valueKey = `${category}_value`;
            const value = entry.payload[valueKey];

            if (value !== undefined && entry.dataKey.includes('_right')) {
              return (
                <div key={index}>
                  <p className="font-semibold text-sm">{category}</p>
                  <p className="text-xs text-muted-foreground">
                    Value: {value?.toFixed(1)} days
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          domain={[-0.5, categories.length - 0.5]}
          ticks={categories.map((_, i) => i)}
          tickFormatter={(value) => categories[value] || ''}
          stroke="hsl(var(--muted-foreground))"
          label={{
            value: 'Category',
            position: 'insideBottom',
            offset: -15,
            style: { fontSize: '12px' }
          }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          label={{
            value: 'Time to Close (days)',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: '12px' }
          }}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconSize={10}
          wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
        />

        {distributions.map((dist, idx) => (
          <React.Fragment key={dist.category}>
            <Area
              type="monotone"
              dataKey={`${dist.category}_left`}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={0.3}
              strokeWidth={2}
              name={dist.category}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey={`${dist.category}_right`}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={0.3}
              strokeWidth={2}
              name={`${dist.category} (mirror)`}
              legendType="none"
              isAnimationActive={false}
            />
          </React.Fragment>
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
