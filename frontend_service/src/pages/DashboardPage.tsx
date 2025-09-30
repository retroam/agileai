import React, { useState } from "react";
import { Search, BarChart3, GitPullRequest, Users, MessageCircle } from "lucide-react";
import { api } from "../lib/api";
import type { RepositoryInfo, RepositoryInsights, Issue } from "../lib/api";
import { PieChart } from "../components/Charts/PieChart";
import { HeatMap } from "../components/Charts/HeatMap";
import { useToast } from "../components/ui/use-toast";

interface RepositoryData {
  info: RepositoryInfo;
  insights: RepositoryInsights;
  issues: Issue[];
}

const RepositoryInput = ({ onAnalyze }: { onAnalyze: (repo: string) => void }) => {
  const [repoUrl, setRepoUrl] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Extract owner/repo from URL or use as is if in that format
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/) || repoUrl.match(/^[^/]+\/[^/]+$/);
    if (match) {
      onAnalyze(match[1]);
    } else {
      alert("Please enter a valid GitHub repository URL or owner/repo format");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Enter GitHub repository (e.g., owner/repo or full URL)"
          className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        Analyze Repository
      </button>
    </form>
  );
};

const MetricsCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  description: string;
  icon: React.ElementType;
}) => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium tracking-tight">{title}</h3>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

const VisualizationCard = ({ title, description, children }: { 
  title: string; 
  description?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        {children}
      </div>
    </div>
  );
};

export function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<RepositoryData | null>(null);
  const { toast } = useToast();

  const analyzeRepository = async (repo: string) => {
    setIsLoading(true);
    try {
      const [infoResponse, insightsResponse, issuesResponse] = await Promise.all([
        api.getRepositoryInfo(repo),
        api.getRepositoryInsights(repo),
        api.getIssues(repo)
      ]);

      setData({
        info: infoResponse.data,
        insights: insightsResponse.data,
        issues: issuesResponse.data
      });

      toast({
        title: "Repository analyzed",
        description: `Successfully analyzed ${repo}`,
      });
    } catch (error) {
      console.error('Error analyzing repository:', error);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze repository",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">GitHub Repository Analyzer</h2>
        <p className="text-muted-foreground">
          Enter a GitHub repository to analyze its activity and metrics.
        </p>
      </div>

      <div className="space-y-4">
        <RepositoryInput onAnalyze={analyzeRepository} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Pull Requests"
          value={data?.info.num_pull_requests || 0}
          description="Open and closed pull requests"
          icon={GitPullRequest}
        />
        <MetricsCard
          title="Contributors"
          value={data?.info.num_contributors || 0}
          description="Number of contributors"
          icon={Users}
        />
        <MetricsCard
          title="Stargazers"
          value={data?.info.num_stargazers || 0}
          description="Repository stars"
          icon={BarChart3}
        />
        <MetricsCard
          title="Issues"
          value={data?.issues.length || 0}
          description="Total number of issues"
          icon={MessageCircle}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <VisualizationCard 
          title="Issue States Distribution" 
          description="Distribution of open vs closed issues"
        >
          {data?.insights.state_distribution ? (
            <div className="h-[300px]">
              <PieChart
                data={[
                  { name: 'Open', value: data.insights.state_distribution.open },
                  { name: 'Closed', value: data.insights.state_distribution.closed }
                ]}
              />
            </div>
          ) : (
            <div className="h-[300px] w-full bg-muted/10 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </VisualizationCard>
        
        <VisualizationCard 
          title="Activity Heatmap" 
          description="Issue creation patterns by day and hour"
        >
          {data?.insights.activity_heatmap ? (
            <div className="h-[300px]">
              <HeatMap data={data.insights.activity_heatmap} />
            </div>
          ) : (
            <div className="h-[300px] w-full bg-muted/10 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </VisualizationCard>
      </div>

      <div className="grid gap-4">
        <VisualizationCard 
          title="Topic Modeling" 
          description="Discovered topics from issue content"
        >
          {data?.insights.topics ? (
            <div className="space-y-4">
              {data.insights.topics.map((topic, index) => (
                <div key={topic.id} className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">Topic {index + 1}</h4>
                  <p className="text-sm text-muted-foreground">
                    {topic.words.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[400px] w-full bg-muted/10 flex items-center justify-center text-muted-foreground">
              No topic data available
            </div>
          )}
        </VisualizationCard>
      </div>
    </div>
  );
} 