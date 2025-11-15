import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleUser, GitPullRequest, Star } from "lucide-react";
import { RepositoryInfo } from "@/lib/api-types";

interface MetricsCardsProps {
  repoInfo: RepositoryInfo;
  isLoading: boolean;
}

export function MetricsCards({ repoInfo, isLoading }: MetricsCardsProps) {
  const metrics = [
    {
      title: "Pull Requests",
      value: repoInfo?.num_pull_requests ?? 0,
      description: "Open PRs",
      icon: <GitPullRequest className="h-4 w-4" />,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
    },
    {
      title: "Contributors",
      value: repoInfo?.num_contributors ?? 0,
      description: "Active contributors",
      icon: <CircleUser className="h-4 w-4" />,
      color: "text-green-500",
      bgColor: "bg-green-100",
    },
    {
      title: "Stars",
      value: repoInfo?.num_stargazers ?? 0,
      description: "Repository stars",
      icon: <Star className="h-4 w-4" />,
      color: "text-amber-500",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric, index) => (
        <Card key={index} className={isLoading ? "opacity-60" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <div
              className={`${metric.bgColor} ${metric.color} p-2 rounded-md`}
            >
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              ) : (
                formatNumber(metric.value)
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
} 