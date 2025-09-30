import type {
  RepositoryInfo,
  Issue,
  WordCloudData,
  TopicModelingData,
  RepositoryInsights,
  CacheStatus,
  RepositoryAnalysisRequest,
  ApiResponse,
  NomicAtlasTopicData
} from './api-types';

export type { RepositoryInfo, RepositoryInsights, Issue, WordCloudData, TopicModelingData, CacheStatus, ApiResponse, NomicAtlasTopicData };

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('API base URL:', API_BASE_URL);  // Debug log the API URL

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // Log the full URL for debugging
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`Making API request to: ${fullUrl}`, options);
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText} for ${fullUrl}`);
        const error = await response.text();
        try {
          const errorJson = JSON.parse(error);
          throw new Error(errorJson.detail || errorJson.message || 'An error occurred');
        } catch (e) {
          throw new Error(`HTTP Error ${response.status}: ${error || response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Request failed for ${fullUrl}:`, error);
      throw error;
    }
  }

  async getRepositoryInfo(repo: string, github_token?: string, forceRefresh: boolean = false): Promise<ApiResponse<RepositoryInfo>> {
    return this.request<RepositoryInfo>(`/analyze/repo`, {
      method: 'POST',
      body: JSON.stringify({
        repo,
        github_token,
        force_refresh: forceRefresh
      })
    });
  }

  async getRepositoryInsights(repo: string, github_token?: string, forceRefresh: boolean = false): Promise<ApiResponse<RepositoryInsights>> {
    return this.request<RepositoryInsights>(`/visualize/insights`, {
      method: 'POST',
      body: JSON.stringify({
        repo,
        github_token,
        force_refresh: forceRefresh
      })
    });
  }

  async getIssues(repo: string, github_token?: string, forceRefresh: boolean = false): Promise<ApiResponse<Issue[]>> {
    return this.request<Issue[]>(`/analyze/issues`, {
      method: 'POST',
      body: JSON.stringify({
        repo,
        github_token,
        force_refresh: forceRefresh
      })
    });
  }

  // Get word cloud data
  async getWordCloudData(
    repo: string,
    field: string = 'body',
    forceRefresh: boolean = false
  ): Promise<ApiResponse<WordCloudData>> {
    const request: RepositoryAnalysisRequest = { repo, github_token: undefined, force_refresh: forceRefresh };
    return this.request<WordCloudData>(`/visualize/wordcloud?field=${field}`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Get topic modeling data
  async getTopicData(
    repo: string,
    field: string = 'body',
    forceRefresh: boolean = false
  ): Promise<ApiResponse<TopicModelingData>> {
    const request: RepositoryAnalysisRequest = { repo, github_token: undefined, force_refresh: forceRefresh };
    return this.request<TopicModelingData>(`/visualize/topics?field=${field}`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Get Nomic Atlas topic data
  async getNomicAtlasTopicData(
    repo: string,
    field: string = "body",
    forceRefresh: boolean = false,
    nomicApiKey?: string
  ): Promise<ApiResponse<NomicAtlasTopicData>> {
    const request = { 
      repo, 
      github_token: undefined, 
      force_refresh: forceRefresh,
      nomic_api_key: nomicApiKey,
      field
    };
    
    try {
      const response = await this.request<NomicAtlasTopicData>(`/visualize/nomic-atlas-topics`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      
      // If the response indicates that processing is still ongoing,
      // we should inform the caller but not treat it as an error
      if (response.data && response.data.status === "processing") {
        console.log("Nomic Atlas topics are still being processed");
      }
      
      return response;
    } catch (error) {
      console.error("Error fetching Nomic Atlas topic data:", error);
      throw error;
    }
  }

  // Combined method to get both word cloud and topic data
  async getTextAnalysisData(
    repo: string,
    field: string = 'body',
    forceRefresh: boolean = false
  ): Promise<ApiResponse<WordCloudData & { topics?: TopicModelingData['topics'] }>> {
    try {
      const [wordCloudResponse, topicResponse] = await Promise.all([
        this.getWordCloudData(repo, field, forceRefresh),
        this.getTopicData(repo, field, forceRefresh)
      ]);
      
      return {
        status: wordCloudResponse.status,
        data: {
          ...wordCloudResponse.data,
          topics: topicResponse.data.topics
        },
        source: wordCloudResponse.source
      };
    } catch (error) {
      console.error("Error fetching text analysis data:", error);
      throw error;
    }
  }

  // Get cache status
  async getCacheStatus(repo: string): Promise<CacheStatus> {
    try {
      const repoInfoResponse = await this.request<any>(`/cache/status`, {
        method: 'POST',
        body: JSON.stringify({ repo })
      });
      
      const result: CacheStatus = {
        repo: repo,
        repo_info_cached: repoInfoResponse.data.repository_info_cached,
        issues_cached: repoInfoResponse.data.issues_cached,
        visualizations_cached: {
          insights: repoInfoResponse.data.insights_cached || false,
          wordcloud: repoInfoResponse.data.wordcloud_cached || false,
          topics: repoInfoResponse.data.topics_cached || false,
          nomic_atlas_topics: repoInfoResponse.data.nomic_atlas_topics_cached || false
        }
      };
      
      return result;
    } catch (error) {
      console.error(`Error checking cache status: ${error}`);
      return {
        repo: repo,
        repo_info_cached: false,
        issues_cached: false,
        visualizations_cached: {}
      };
    }
  }

  async clearCache(repo: string): Promise<boolean> {
    try {
      await this.request<any>(`/cache/clear`, {
        method: 'POST',
        body: JSON.stringify({ repo })
      });
      return true;
    } catch (error) {
      console.error(`Error clearing cache: ${error}`);
      return false;
    }
  }

  // Chat with issues
  async chatWithIssues(repo: string, query: string, github_token?: string): Promise<{
    answer: string;
    approach?: string;
    chat_history?: any[];
    error?: string;
  }> {
    return this.request<{
      answer: string;
      approach?: string;
      chat_history?: any[];
      error?: string;
    }>(`/chat/ask`, {
      method: 'POST',
      body: JSON.stringify({
        repo,
        query,
        github_token
      })
    }).then(response => response.data);
  }
}

export const api = new ApiClient(); 