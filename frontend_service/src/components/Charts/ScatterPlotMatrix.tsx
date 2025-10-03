import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ScatterDataPoint {
  timeToClose: number;
  comments: number;
  state: string;
  title: string;
}

interface ScatterPlotMatrixProps {
  data: ScatterDataPoint[];
  height?: number;
}

export function ScatterPlotMatrix({ data, height = 350 }: ScatterPlotMatrixProps) {
  const getColor = (state: string) => {
    return state === 'closed' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-3))';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1 max-w-[200px] truncate">
            {data.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Time to Close: {data.timeToClose?.toFixed(1) || 'N/A'} days
          </p>
          <p className="text-xs text-muted-foreground">
            Comments: {data.comments}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            Status: {data.state}
          </p>
        </div>
      );
    }
    return null;
  };

  const filteredData = data.filter(d => d.timeToClose !== null && d.timeToClose !== undefined && !isNaN(d.timeToClose));

  // Calculate reasonable domain for X-axis
  const timeValues = filteredData.map(d => d.timeToClose);
  const maxTime = Math.max(...timeValues);
  const xDomain = [0, Math.ceil(maxTime * 1.1)]; // Add 10% padding

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 70 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          dataKey="timeToClose"
          name="Time to Close"
          domain={xDomain}
          stroke="hsl(var(--muted-foreground))"
          label={{
            value: 'Time to Close (days)',
            position: 'insideBottom',
            offset: -15,
            style: { fontSize: '12px' }
          }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="comments"
          name="Comments"
          stroke="hsl(var(--muted-foreground))"
          label={{
            value: 'Number of Comments',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: '12px' }
          }}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Legend
          verticalAlign="top"
          height={36}
          iconSize={10}
          wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
        />
        <Scatter
          name="Closed"
          data={filteredData.filter(d => d.state === 'closed')}
          fill="hsl(var(--chart-1))"
        >
          {filteredData.filter(d => d.state === 'closed').map((entry, index) => (
            <Cell key={`closed-${index}`} fill={getColor('closed')} />
          ))}
        </Scatter>
        <Scatter
          name="Open"
          data={filteredData.filter(d => d.state === 'open')}
          fill="hsl(var(--chart-3))"
        >
          {filteredData.filter(d => d.state === 'open').map((entry, index) => (
            <Cell key={`open-${index}`} fill={getColor('open')} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
