import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Rectangle, Layer } from 'recharts';

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  percentage?: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
}

export function SankeyChart({ data, height = 400 }: SankeyChartProps) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No flow data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          {data.source && data.target ? (
            <>
              <p className="font-semibold text-sm">
                {data.source.name} → {data.target.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Issues: {data.value}{data.percentage !== undefined ? ` (${data.percentage.toFixed(1)}%)` : ''}
              </p>
            </>
          ) : (
            <p className="font-semibold text-sm">{data.name}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    const isLeft = x < containerWidth / 2;

    return (
      <Layer key={`CustomNode${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill="hsl(var(--primary))"
          fillOpacity={0.8}
        />
        <text
          textAnchor={isLeft ? "end" : "start"}
          x={isLeft ? x - 8 : x + width + 8}
          y={y + height / 2}
          fontSize="12"
          stroke="none"
          fill="hsl(var(--foreground))"
          dominantBaseline="middle"
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={data}
        node={<CustomNode />}
        link={{
          stroke: 'hsl(var(--primary))',
          strokeOpacity: 0.3
        }}
        nodePadding={50}
        margin={{ top: 20, right: 100, bottom: 20, left: 100 }}
      >
        <Tooltip content={<CustomTooltip />} />
      </Sankey>
    </ResponsiveContainer>
  );
}
