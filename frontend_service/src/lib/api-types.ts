// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  source?: 'cache' | 'api' | 'generated';
}

// Repository Info
export interface RepositoryInfo {
  num_pull_requests: number;
  num_contributors: number;
  num_stargazers: number;
}

// Issues
export interface Issue {
  title: string;
  body: string;
  state: 'open' | 'closed';
  user: string;
  comments: number;
  labels: string[];
  created_at: string;
  closed_at: string | null;
  time_to_close: number | null;
}

// Word Cloud
export interface WordCloudData {
  wordcloud: {
    words: {
      text: string;
      value: number;
    }[];
  };
  treemap: {
    children: {
      name: string;
      value: number;
    }[];
  };
}

// Topic Modeling
export interface TopicModelingData {
  topics: {
    id: number;
    words: {
      text: string;
      value: number;
    }[];
    label: string;
  }[];
}

// Nomic Atlas Topic Data
export interface NomicAtlasTopicData {
  topics?: Record<string, any>[];
  topic_hierarchy?: Record<string, any>;
  topic_counts?: {
    [key: string]: Record<string, number>;
  };
  topic_groups?: {
    [key: string]: any[];
  };
  status?: "processing" | "complete" | "timeout";
  message?: string;
  error?: string;
}

// Repository Insights
export interface RepositoryInsights {
  state_distribution: {
    [key: string]: number;
  };
  time_to_close_stats: {
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  top_contributors: {
    [key: string]: number;
  };
  comments_stats: {
    total: number;
    mean: number;
    median: number;
    max: number;
  };
  issues_over_time: {
    date: string;
    count: number;
    cumulative: number;
  }[];
  state_over_time: {
    date: string;
    open?: number;
    closed?: number;
  }[];
  activity_heatmap: {
    day: string;
    hour: number;
    count: number;
  }[];
}

// Cache Status
export interface CacheStatus {
  repo: string;
  repo_info_cached: boolean;
  issues_cached: boolean;
  visualizations_cached: {
    [key: string]: boolean | undefined;
    insights?: boolean;
    wordcloud?: boolean;
    topics?: boolean;
    nomic_atlas_topics?: boolean;
  };
}

// Request Types
export interface RepositoryAnalysisRequest {
  repo: string;
  github_token?: string;
  force_refresh?: boolean;
} 