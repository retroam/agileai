import React from 'react';
import { ChartExamples } from '@/components/Charts/ChartExamples';

export function ChartExamplesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Chart Examples</h1>
      <p className="text-center mb-8 text-muted-foreground">
        Examples of charts built with Recharts and styled with Shadcn UI
      </p>
      <ChartExamples />
    </div>
  );
} 