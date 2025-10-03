import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

interface CollaborationData {
  id: string;
  data: {
    x: string;
    y: number;
  }[];
}

interface CollaborationMatrixProps {
  data: CollaborationData[];
  height?: number;
}

export function CollaborationMatrix({ data, height = 400 }: CollaborationMatrixProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No collaboration data available
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveHeatMap
        data={data}
        margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
        valueFormat=">-.0f"
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendOffset: 46
        }}
        axisRight={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Contributors',
          legendPosition: 'middle',
          legendOffset: 70
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Contributors',
          legendPosition: 'middle',
          legendOffset: -72
        }}
        colors={{
          type: 'sequential',
          scheme: 'blues'
        }}
        emptyColor="#f8f9fa"
        legends={[
          {
            anchor: 'bottom',
            translateX: 0,
            translateY: 30,
            length: 400,
            thickness: 8,
            direction: 'row',
            tickPosition: 'after',
            tickSize: 3,
            tickSpacing: 4,
            tickOverlap: false,
            title: 'Shared Issues →',
            titleAlign: 'start',
            titleOffset: 4
          }
        ]}
        hoverTarget="cell"
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
}
