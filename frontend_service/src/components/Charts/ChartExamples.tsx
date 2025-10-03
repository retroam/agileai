import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, BarChart, AreaChart, PieChart, DonutChart, ChartConfig } from './index';

// Sample data for the charts
const monthlyData = [
  { month: "Jan", desktop: 120, mobile: 80, tablet: 50 },
  { month: "Feb", desktop: 150, mobile: 100, tablet: 60 },
  { month: "Mar", desktop: 180, mobile: 120, tablet: 70 },
  { month: "Apr", desktop: 220, mobile: 140, tablet: 90 },
  { month: "May", desktop: 250, mobile: 160, tablet: 100 },
  { month: "Jun", desktop: 280, mobile: 180, tablet: 110 },
];

const categoryData = [
  { category: "Category A", value: 400 },
  { category: "Category B", value: 300 },
  { category: "Category C", value: 200 },
  { category: "Category D", value: 100 },
  { category: "Category E", value: 50 },
];

const browserData = [
  { browser: "Chrome", visitors: 1275 },
  { browser: "Safari", visitors: 863 },
  { browser: "Firefox", visitors: 587 },
  { browser: "Edge", visitors: 412 },
  { browser: "Other", visitors: 253 },
];

const browserConfig: ChartConfig = {
  visitors: {
    label: "Visitors",
  },
  Chrome: {
    label: "Chrome",
    color: "hsl(var(--chart-1))",
  },
  Safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
  Firefox: {
    label: "Firefox",
    color: "hsl(var(--chart-3))",
  },
  Edge: {
    label: "Edge",
    color: "hsl(var(--chart-4))",
  },
  Other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
  },
};

// New themed data for showcasing the theme colors
const themeColorData = [
  { name: "Primary", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Secondary", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Tertiary", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Quaternary", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Quinary", value: 5, color: "hsl(var(--chart-5))" },
];

const themeConfig: ChartConfig = {
  Primary: {
    label: "Primary",
    color: "hsl(var(--chart-1))",
  },
  Secondary: {
    label: "Secondary",
    color: "hsl(var(--chart-2))",
  },
  Tertiary: {
    label: "Tertiary",
    color: "hsl(var(--chart-3))",
  },
  Quaternary: {
    label: "Quaternary",
    color: "hsl(var(--chart-4))",
  },
  Quinary: {
    label: "Quinary",
    color: "hsl(var(--chart-5))",
  },
};

export function ChartExamples() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Line Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Line Chart Example</h3>
        <div className="h-[300px]">
          <LineChart
            data={monthlyData}
            lines={[
              { dataKey: "desktop", name: "Desktop", color: "hsl(var(--chart-1))" },
              { dataKey: "mobile", name: "Mobile", color: "hsl(var(--chart-2))" },
              { dataKey: "tablet", name: "Tablet", color: "hsl(var(--chart-3))" }
            ]}
            xAxisDataKey="month"
            yAxisLabel="Users"
            xAxisLabel="Month"
            height={300}
          />
        </div>
      </Card>

      {/* Bar Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Bar Chart Example</h3>
        <div className="h-[300px]">
          <BarChart
            data={categoryData}
            bars={[
              { dataKey: "value", name: "Value", color: "hsl(var(--chart-4))" }
            ]}
            xAxisDataKey="category"
            yAxisLabel="Value"
            xAxisLabel="Category"
            height={300}
          />
        </div>
      </Card>

      {/* Stacked Bar Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Stacked Bar Chart Example</h3>
        <div className="h-[300px]">
          <BarChart
            data={monthlyData}
            bars={[
              { dataKey: "desktop", name: "Desktop", color: "hsl(var(--chart-1))", stackId: "stack" },
              { dataKey: "mobile", name: "Mobile", color: "hsl(var(--chart-2))", stackId: "stack" },
              { dataKey: "tablet", name: "Tablet", color: "hsl(var(--chart-3))", stackId: "stack" }
            ]}
            xAxisDataKey="month"
            yAxisLabel="Users"
            xAxisLabel="Month"
            height={300}
          />
        </div>
      </Card>

      {/* Area Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Area Chart Example</h3>
        <div className="h-[300px]">
          <AreaChart
            data={monthlyData}
            areas={[
              { dataKey: "desktop", name: "Desktop", color: "hsl(var(--chart-1))" },
              { dataKey: "mobile", name: "Mobile", color: "hsl(var(--chart-2))" },
              { dataKey: "tablet", name: "Tablet", color: "hsl(var(--chart-3))" }
            ]}
            xAxisDataKey="month"
            yAxisLabel="Users"
            xAxisLabel="Month"
            height={300}
          />
        </div>
      </Card>

      {/* Pie Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Pie Chart Example</h3>
        <div className="h-[300px]">
          <PieChart
            data={categoryData.map(item => ({ 
              name: item.category, 
              value: item.value 
            }))}
          />
        </div>
      </Card>

      {/* Donut Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Donut Chart Example</h3>
        <div className="h-[300px]">
          <DonutChart
            data={browserData.map(item => ({
              name: item.browser,
              value: item.visitors,
              browser: item.browser,
              visitors: item.visitors
            }))}
            nameKey="browser"
            valueKey="visitors"
            totalLabel="Visitors"
            config={browserConfig}
          />
        </div>
      </Card>

      {/* Themed Donut Chart Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Themed Donut Chart</h3>
        <div className="h-[300px]">
          <DonutChart
            data={themeColorData}
            totalLabel="Theme Colors"
            config={themeConfig}
          />
        </div>
      </Card>
    </div>
  );
} 