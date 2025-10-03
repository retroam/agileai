import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface TreeMapProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  title?: string;
  height?: number | string;
  colors?: string[];
}

export function TreeMap({ data, title, height = '100%', colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'] }: TreeMapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Format data for ApexCharts treemap
  const formattedData = data.map(item => ({
    x: item.name,
    y: item.value
  }));

  const options: ApexOptions = {
    chart: {
      type: 'treemap',
      toolbar: {
        show: false
      },
      fontFamily: 'inherit',
      background: 'transparent',
      events: {
        dataPointSelection: function(event, chartContext, config) {
          // This is triggered when a treemap item is clicked
          console.log("Item clicked:", config.w.globals.labels[config.dataPointIndex]);
        }
      }
    },
    title: {
      text: title || undefined,
      align: 'center',
      style: {
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: 'inherit',
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontFamily: 'inherit',
        fontWeight: 400,
        colors: ['#fff']
      },
      formatter: function(text: string, op: any) {
        // Only show the word, not the value
        return [text];
      },
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: true,
        shadeIntensity: 0.2,
      }
    },
    colors: colors,
    tooltip: {
      enabled: true,
      theme: 'dark',
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        const value = series[seriesIndex][dataPointIndex];
        const name = w.globals.labels[dataPointIndex];
        // Format to 1 decimal place
        const formattedValue = parseFloat(value).toFixed(1);
        
        return `
          <div class="p-2">
            <span class="font-medium">${name}</span>: 
            <span>${formattedValue}</span>
          </div>
        `;
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            height: 250
          }
        }
      }
    ],
  };

  return (
    <div className="h-full w-full">
      <ReactApexChart
        options={options}
        series={[{ data: formattedData }]}
        type="treemap"
        height={height}
      />
    </div>
  );
} 