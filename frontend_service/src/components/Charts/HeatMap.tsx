import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

interface HeatMapProps {
  data: Array<{
    day: string;
    hour: number;
    count: number;
  }>;
}

export function HeatMap({ data }: HeatMapProps) {
  // Transform data into Nivo's expected format
  const transformedData = transformDataForNivo(data);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">Issue creation patterns by day and hour</p>
        <ActivityIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <ResponsiveHeatMap
          data={transformedData}
          margin={{ top: 20, right: 20, bottom: 20, left: 110 }}
          axisTop={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 16,
          }}
          axisBottom={null}
          colors={{
            type: 'sequential',
            scheme: 'blues',
          }}
          theme={{
            tooltip: {
              container: {
                fontSize: "12px",
                borderRadius: "6px",
                padding: "8px 12px",
              },
            },
            grid: {
              line: {
                stroke: "hsl(var(--border))",
                strokeWidth: 1,
              },
            },
          }}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 3]],
          }}
          role="application"
          ariaLabel="Activity patterns heatmap"
          animate={true}
          forceSquare={true}
        />
      </div>
    </div>
  );
}

// Helper function to transform data into Nivo's format
function transformDataForNivo(data: HeatMapProps['data']) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return days.map(day => ({
    id: day,
    data: hours.map(hour => {
      const cell = data.find(d => d.day === day && d.hour === hour);
      return {
        x: hour.toString(),
        y: cell?.count || 0
      };
    })
  }));
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}