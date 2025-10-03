import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw, GitPullRequest, Users, Star, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable/data-table';
import { columns } from '@/components/DataTable/columns';
import { api } from '@/lib/api';
import type { RepositoryInfo, RepositoryInsights, Issue, WordCloudData, TopicModelingData, NomicAtlasTopicData } from '@/lib/api';
import { PieChart } from '@/components/Charts/PieChart';
import { HeatMap } from '@/components/Charts/HeatMap';
import { BarChart } from '@/components/Charts/BarChart';
import { LineChart } from '@/components/Charts/LineChart';
import { ScatterChart } from '@/components/Charts/ScatterChart';
import { TreeMap } from '@/components/Charts/TreeMap';
import { TimelineChart } from '@/components/Charts/TimelineChart';
import { ScatterPlotMatrix } from '@/components/Charts/ScatterPlotMatrix';
import { FunnelChart } from '@/components/Charts/FunnelChart';
import { RadarChart } from '@/components/Charts/RadarChart';
import { Sparkline } from '@/components/Charts/Sparkline';
import { CollaborationMatrix } from '@/components/Charts/CollaborationMatrix';
import { SankeyChart } from '@/components/Charts/SankeyChart';
import { ViolinPlot } from '@/components/Charts/ViolinPlot';
import { PyLDAVisViewer } from '@/components/PyLDAVisViewer';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChatInterface } from '@/components/Chat/ChatInterface';

interface RepositoryData {
  info: RepositoryInfo;
  insights: RepositoryInsights;
  issues: Issue[];
}

export function AnalysisPage() {
  console.log('AnalysisPage rendered');
  const { repo } = useParams<{ repo: string }>();
  console.log('Repository param:', repo);
  
  const navigate = useNavigate();
  const [data, setData] = useState<RepositoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    state: '',
    user: '',
  });
  const [isTextAnalysisLoading, setIsTextAnalysisLoading] = useState(false);
  const [wordCloudData, setWordCloudData] = useState<WordCloudData | null>(null);
  const [isTopicModelingLoading, setIsTopicModelingLoading] = useState(false);
  const [topicData, setTopicData] = useState<TopicModelingData | null>(null);
  const [currentAnalysisField, setCurrentAnalysisField] = useState<string>('title');
  const [isNomicTopicsLoading, setIsNomicTopicsLoading] = useState(false);
  const [nomicTopicData, setNomicTopicData] = useState<NomicAtlasTopicData | null>(null);

  // Add this function to filter issues
  const getFilteredIssues = (issues: Issue[]) => {
    return issues.filter(issue => {
      // Global search across multiple fields
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        issue.title.toLowerCase().includes(searchLower) ||
        (issue.body?.toLowerCase().includes(searchLower) ?? false) ||
        issue.user.toLowerCase().includes(searchLower) ||
        issue.labels.some(label => label.toLowerCase().includes(searchLower));

      // Column-specific filters
      const matchesState = filters.state === '' || issue.state === filters.state;
      const matchesUser = filters.user === '' || issue.user === filters.user;

      return matchesSearch && matchesState && matchesUser;
    });
  };

  // Memoize expensive computations
  const memoizedFilteredIssues = useMemo(() => {
    if (!data?.issues) return [];
    return getFilteredIssues(data.issues).slice(0, Math.min(200, data.issues.length));
  }, [data?.issues, searchQuery, filters]);

  const memoizedScatterData = useMemo(() => {
    if (!data?.issues) return [];
    return data.issues
      .filter(issue => issue.time_to_close !== null)
      .map(issue => ({
        x: issue.comments,
        y: issue.time_to_close || 0,
        name: issue.title
      }));
  }, [data?.issues]);

  const memoizedResolutionData = useMemo(() => {
    if (!data?.issues) return [];
    return [
      { name: '< 1 day', value: data.issues.filter(i => i.time_to_close !== null && i.time_to_close <= 1).length },
      { name: '1-7 days', value: data.issues.filter(i => i.time_to_close !== null && i.time_to_close > 1 && i.time_to_close <= 7).length },
      { name: '1-4 weeks', value: data.issues.filter(i => i.time_to_close !== null && i.time_to_close > 7 && i.time_to_close <= 28).length },
      { name: '1-3 months', value: data.issues.filter(i => i.time_to_close !== null && i.time_to_close > 28 && i.time_to_close <= 90).length },
      { name: '> 3 months', value: data.issues.filter(i => i.time_to_close !== null && i.time_to_close > 90).length }
    ];
  }, [data?.issues]);

  const memoizedContributorsData = useMemo(() => {
    if (!data?.insights?.top_contributors) return [];
    return Object.entries(data.insights.top_contributors).map(([name, count]) => ({
      name,
      value: count
    }));
  }, [data?.insights?.top_contributors]);

  const memoizedWordCloudData = useMemo(() => {
    if (!wordCloudData?.wordcloud?.words) return [];
    return wordCloudData.wordcloud.words
      .sort((a, b) => b.value - a.value) // Sort by value descending
      .slice(0, 100); // Limit to top 100 words for performance
  }, [wordCloudData?.wordcloud?.words]);

  const memoizedTreeMapData = useMemo(() => {
    if (!wordCloudData?.treemap?.children) return [];
    return wordCloudData.treemap.children
      .slice(0, 25)
      .map((item: { name: string; value: number }) => ({
        name: item.name,
        value: item.value
      }));
  }, [wordCloudData?.treemap?.children]);

  const memoizedTopicLabels = useMemo(() => {
    if (!topicData?.topics) return [];
    return topicData.topics
      .filter(topic => topic.id < 5) // Show first 5 topics
      .map(topic => ({
        id: topic.id,
        words: topic.words.slice(0, 5),
        label: topic.label
      }));
  }, [topicData?.topics]);

  const memoizedTopicCharts = useMemo(() => {
    if (!topicData?.topics) return [];
    return topicData.topics
      .filter(topic => topic.id < 5)
      .map(topic => ({
        id: topic.id,
        words: topic.words.slice(0, 7).map(word => ({
          name: word.text,
          value: Math.round(word.value),
          tooltip: `${word.text}: ${Math.round(word.value)}`
        }))
      }));
  }, [topicData?.topics]);

  // Get the API URL for debugging
  useEffect(() => {
    setApiUrl(import.meta.env.VITE_API_URL || 'Not set');
  }, []);

  const fetchData = async (forceRefresh: boolean = false) => {
    if (!repo) return;
    
    const decodedRepo = decodeURIComponent(repo);
    console.log(`Fetching data for ${decodedRepo}, forceRefresh: ${forceRefresh}`);
    
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('Making API calls to:', import.meta.env.VITE_API_URL);
      console.log('Fetching repository info...');
      
      const [infoResponse, insightsResponse, issuesResponse] = await Promise.all([
        api.getRepositoryInfo(decodedRepo, undefined, forceRefresh),
        api.getRepositoryInsights(decodedRepo, undefined, forceRefresh),
        api.getIssues(decodedRepo, undefined, forceRefresh)
      ]);
      
      console.log('API calls completed successfully');
      console.log('Data source:', infoResponse.source);
      setDataSource(infoResponse.source || 'unknown');

      setData({
        info: infoResponse.data,
        insights: insightsResponse.data,
        issues: issuesResponse.data
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('AnalysisPage useEffect triggered with repo:', repo);
    console.log('API URL:', import.meta.env.VITE_API_URL);
    
    // Redirect to home if repo is undefined or invalid
    if (!repo) {
      console.log('No repo parameter, redirecting to home');
      navigate('/');
      return;
    }

    const decodedRepo = decodeURIComponent(repo);
    console.log('Decoded repo:', decodedRepo);
    
    if (!/^[^/]+\/[^/]+$/.test(decodedRepo)) {
      console.log('Invalid repo format, redirecting to home');
      navigate('/');
      return;
    }

    // Set API URL for display
    setApiUrl(import.meta.env.VITE_API_URL || 'Not set');
    
    // Fetch data with initial load (no force refresh)
    fetchData(false);
  }, [repo, navigate]);

  const handleRefresh = () => {
    if (!repo) return;
    fetchData(true); // Force refresh
  };

  console.log('Current state:', { isLoading, error, hasData: !!data, apiUrl });


  // Add this function to get unique values for filters
  const getUniqueValues = (issues: Issue[], field: keyof Issue) => {
    const values = new Set(issues.map(issue => String(issue[field])));
    return Array.from(values).sort();
  };

  // Load text analysis data
  const loadTextAnalysisData = async (field: string) => {
    if (!repo) return;
    
    try {
      // Start loading
      setIsTextAnalysisLoading(true);
      setIsTopicModelingLoading(true);
      setWordCloudData(null);
      setTopicData(null);
      setCurrentAnalysisField(field);
      
      const decodedRepo = decodeURIComponent(repo);
      console.log(`Loading text analysis data for ${decodedRepo}, field: ${field}`);
      
      const baseApiUrl = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Get wordcloud data using the API client
      try {
        const wcResponse = await api.getWordCloudData(decodedRepo, field);
        if (wcResponse.status === 'success' && wcResponse.data) {
          console.log('Wordcloud data loaded successfully');
          setWordCloudData(wcResponse.data);
        } else {
          console.error('Failed to load wordcloud data:', wcResponse);
        }
      } catch (wcError) {
        console.error('Error loading wordcloud data:', wcError);
      }
      
      setIsTextAnalysisLoading(false);
      
      // Now try to get the topic data from pyLDAvis (which has better topic modeling)
      try {
        console.log('Fetching advanced topic data from pyLDAvis...');
        
        const topicsUrl = `${baseApiUrl}/visualize/topics-from-ldavis?repo=${encodeURIComponent(decodedRepo)}&field=${field}`;
        console.log('Fetching topic data from:', topicsUrl);
        
        const response = await fetch(topicsUrl);
        if (response.ok) {
          const ldavisTopics = await response.json();
          console.log('Advanced topic data loaded successfully:', ldavisTopics);
          
          // Use the pyLDAvis topics if available
          if (ldavisTopics && ldavisTopics.topics && ldavisTopics.topics.length > 0) {
            setTopicData(ldavisTopics);
          } else {
            console.log('No advanced topics available, falling back to basic topic modeling');
            
            // Fall back to the original topics using the API client
            try {
              const fallbackResponse = await api.getTopicData(decodedRepo, field);
              if (fallbackResponse.status === 'success' && fallbackResponse.data) {
                console.log('Basic topic data loaded successfully');
                setTopicData(fallbackResponse.data);
              } else {
                console.error('Failed to load basic topic data:', fallbackResponse);
              }
            } catch (fallbackError) {
              console.error('Failed to load basic topic data:', fallbackError);
            }
          }
        } else {
          console.error('Failed to load advanced topic data:', await response.text());
          
          // Fall back to basic topic modeling using the API client
          try {
            const fallbackResponse = await api.getTopicData(decodedRepo, field);
            if (fallbackResponse.status === 'success' && fallbackResponse.data) {
              console.log('Fallback topic data loaded successfully');
              setTopicData(fallbackResponse.data);
            } else {
              console.error('Failed to load fallback topic data:', fallbackResponse);
            }
          } catch (fallbackError) {
            console.error('Failed to load fallback topic data:', fallbackError);
          }
        }
      } catch (topicError) {
        console.error('Error loading topic data:', topicError);
        
        // Try the basic topic modeling as a last resort using the API client
        try {
          const lastResortResponse = await api.getTopicData(decodedRepo, field);
          if (lastResortResponse.status === 'success' && lastResortResponse.data) {
            console.log('Last resort topic data loaded successfully');
            setTopicData(lastResortResponse.data);
          } else {
            console.error('Failed to load last resort topic data:', lastResortResponse);
          }
        } catch (lastError) {
          console.error('Failed to load any topic data:', lastError);
        }
      } finally {
        setIsTopicModelingLoading(false);
      }
      
    } catch (error) {
      console.error('Error loading text analysis data:', error);
      setIsTextAnalysisLoading(false);
      setIsTopicModelingLoading(false);
    }
  };

  // Load Nomic Atlas topic data
  const loadNomicAtlasTopicData = async (field: string, retryCount: number = 0) => {
    if (!repo) return;
    
    const decodedRepo = decodeURIComponent(repo);
    setIsNomicTopicsLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      console.log(`Loading Nomic Atlas topic data for field: ${field}`);
      const response = await api.getNomicAtlasTopicData(decodedRepo, field);
      
      // Set the data source (cache or API)
      if (response.source) {
        setDataSource(response.source);
      }
      
      // Check if the response contains an error message
      if (response.data && 'error' in response.data) {
        console.error('Nomic Atlas error:', response.data.error);
        
        // Check if this is the "Dataset is locked" error
        if (response.data.error && response.data.error.includes("Dataset is locked for state access")) {
          // If we haven't exceeded max retries, try again after a delay
          const maxRetries = 5;
          if (retryCount < maxRetries) {
            console.log(`Dataset is locked. Retry ${retryCount + 1}/${maxRetries} in 10 seconds...`);
            setError(`Nomic Atlas is processing the data. Retrying in 10 seconds... (${retryCount + 1}/${maxRetries})`);
            
            // Set a timeout to retry after 10 seconds
            setTimeout(() => {
              loadNomicAtlasTopicData(field, retryCount + 1);
            }, 10000);
            
            return;
          } else {
            setError(`Nomic Atlas error: Dataset is locked. Maximum retries exceeded. Please try again later.`);
          }
        } else {
          setError(`Nomic Atlas error: ${response.data.error}`);
        }
      } else if (response.data && response.data.status === "processing") {
        console.log('Nomic Atlas topics are still being processed');
        
        // If the data is still processing, retry after a delay
        const maxRetries = 5;
        if (retryCount < maxRetries) {
          console.log(`Data is still processing. Retry ${retryCount + 1}/${maxRetries} in 10 seconds...`);
          
          // Set a timeout to retry after 10 seconds
          setTimeout(() => {
            loadNomicAtlasTopicData(field, retryCount + 1);
          }, 10000);
        }
        
        // We don't set an error here, as processing is a normal state
      } else if (response.data && response.data.status === "timeout") {
        console.warn('Nomic Atlas topic generation timed out');
        // We don't set an error here, as the UI will handle this state
      } else {
        console.log('Nomic Atlas topic data loaded successfully');
        if (response.source === 'cache') {
          console.log('Using cached Nomic Atlas topic data (refreshed weekly)');
        }
      }
      
      setNomicTopicData(response.data);
    } catch (err) {
      console.error('Error loading Nomic Atlas topic data:', err);
      
      // Check if this is a 500 error with "Dataset is locked"
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Nomic Atlas topic data';
      if (errorMessage.includes("Dataset is locked for state access")) {
        // If we haven't exceeded max retries, try again after a delay
        const maxRetries = 5;
        if (retryCount < maxRetries) {
          console.log(`Dataset is locked. Retry ${retryCount + 1}/${maxRetries} in 10 seconds...`);
          setError(`Nomic Atlas is processing the data. Retrying in 10 seconds... (${retryCount + 1}/${maxRetries})`);
          
          // Set a timeout to retry after 10 seconds
          setTimeout(() => {
            loadNomicAtlasTopicData(field, retryCount + 1);
          }, 10000);
          
          return;
        } else {
          setError(`Nomic Atlas error: Dataset is locked. Maximum retries exceeded. Please try again later.`);
        }
      } else {
        setError(`Nomic Atlas error: ${errorMessage}`);
      }
      
      setNomicTopicData(null);
    } finally {
      // Only set loading to false if we're not retrying
      if (retryCount === 0) {
        setIsNomicTopicsLoading(false);
      }
    }
  };

  // Effect to load text analysis data when repository data is available
  useEffect(() => {
    if (currentAnalysisField && data?.issues) {
      loadTextAnalysisData(currentAnalysisField);
    }
  }, [currentAnalysisField, data?.issues]);

  // Effect to update topic data when word cloud data changes
  useEffect(() => {
    if (wordCloudData && !isTextAnalysisLoading) {
      // If we have word cloud data but no topic data, try to extract it
      const wordCloudDataAny = wordCloudData as any;
      if (wordCloudDataAny.topics) {
        setTopicData({
          topics: wordCloudDataAny.topics
        });
      }
    }
  }, [data, wordCloudData, isTextAnalysisLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          Analyzing repository {repo ? decodeURIComponent(repo) : ''}...
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          API URL: {apiUrl}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-red-500">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-100 rounded">
            <p>API URL: {apiUrl}</p>
            <p>Repository: {repo}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Try another repository
          </button>
        </div>
      </div>
    );
  }

  if (!repo) {
    navigate('/');
    return null;
  }

  const displayRepo = decodeURIComponent(repo);
  console.log('Rendering analysis page for:', displayRepo);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{displayRepo}</h1>
          <p className="text-sm text-muted-foreground">
            Data source: {isRefreshing ? 'Refreshing...' : dataSource}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
          >
            Analyze another repository
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="experimental">Experimental</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-center">Repository Overview</h2>
            {data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm text-muted-foreground">Pull Requests</div>
                    <GitPullRequest className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{data.info.num_pull_requests}</div>
                  {data.insights.issues_over_time.length > 0 && (
                    <div className="mt-2 w-full">
                      <Sparkline
                        data={data.insights.issues_over_time.slice(-7).map(d => d.count)}
                        height={30}
                        color="hsl(217, 91%, 60%)"
                      />
                    </div>
                  )}
                </div>
                <div className="p-4 border rounded flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm text-muted-foreground">Contributors</div>
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{data.info.num_contributors}</div>
                  {data.insights.issues_over_time.length > 0 && (
                    <div className="mt-2 w-full">
                      <Sparkline
                        data={data.insights.issues_over_time.slice(-7).map(d => d.cumulative / 100)}
                        height={30}
                        color="hsl(142, 71%, 45%)"
                      />
                    </div>
                  )}
                </div>
                <div className="p-4 border rounded flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm text-muted-foreground">Stars</div>
                    <Star className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="text-2xl font-bold">{data.info.num_stargazers}</div>
                  {data.insights.issues_over_time.length > 0 && (
                    <div className="mt-2 w-full">
                      <Sparkline
                        data={data.insights.issues_over_time.slice(-7).map((_, i) => data.info.num_stargazers * (0.9 + i * 0.02))}
                        height={30}
                        color="hsl(45, 93%, 47%)"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Issue States Distribution</h3>
                  <div className="h-[300px]">
                    <PieChart
                      data={[
                        { name: 'Open', value: data.insights.state_distribution.open || 0 },
                        { name: 'Closed', value: data.insights.state_distribution.closed || 0 }
                      ]}
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Top Contributors</h3>
                  <div className="h-[300px]">
                    <BarChart
                      data={memoizedContributorsData}
                      xKey="name"
                      yKey="value"
                      layout="horizontal"
                      title="Number of Issues"
                    />
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Time to Close vs Comments</h3>
                  <div className="h-[300px]">
                    <ScatterChart
                      data={memoizedScatterData}
                      xLabel="Number of Comments"
                      yLabel="Days to Close"
                      title="Issue Resolution Time"
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Resolution Time Distribution</h3>
                  <div className="h-[300px]">
                    <BarChart
                      data={memoizedResolutionData}
                      xKey="name"
                      yKey="value"
                      title="Number of Issues"
                    />
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center">Issues Overview</h3>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search issues..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                          }}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-32">
                        <select
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                          value={filters.state}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, state: e.target.value }));
                          }}
                        >
                          <option value="">All States</option>
                          {data && getUniqueValues(data.issues, 'state').map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-48">
                        <select
                          className="w-full px-3 py-2 rounded-md border border-input bg-background"
                          value={filters.user}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, user: e.target.value }));
                          }}
                        >
                          <option value="">All Users</option>
                          {data && getUniqueValues(data.issues, 'user').map(user => (
                            <option key={user} value={user}>{user}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-auto">
                    {data && (
                      <DataTable
                        columns={columns}
                        data={memoizedFilteredIssues}
                      />
                    )}
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Issue Creation Rate</h3>
                  <div className="h-[300px]">
                    <LineChart
                      data={data.insights.issues_over_time}
                      xKey="date"
                      yKey="count"
                      title="New Issues per Period"
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Issues Over Time</h3>
                  <div className="h-[300px]">
                    <LineChart
                      data={data.insights.issues_over_time}
                      xKey="date"
                      yKey="cumulative"
                      title="Total Issues"
                    />
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Activity Patterns</h3>
                <div className="h-[300px]">
                  <HeatMap data={data.insights.activity_heatmap} />
                </div>
              </Card>

              {/* NEW ADVANCED ANALYTICS SECTION */}
              <div className="pt-6 border-t">
                <h2 className="text-2xl font-bold mb-4">Advanced Analytics</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Repository Health Radar */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Repository Health Metrics</h3>
                    <div className="h-[400px]">
                      {(() => {
                        const totalIssues = data.issues.length;
                        const closedIssues = data.issues.filter(i => i.state === 'closed').length;
                        const avgTimeToClose = data.insights.time_to_close_stats.mean || 0;
                        const avgComments = data.insights.comments_stats.mean || 0;

                        const radarData = [
                          { metric: "Activity", value: Math.min(totalIssues / 10, 100), fullMark: 100 },
                          { metric: "Resolution Rate", value: totalIssues > 0 ? (closedIssues / totalIssues * 100) : 0, fullMark: 100 },
                          { metric: "Response Speed", value: Math.max(0, 100 - avgTimeToClose), fullMark: 100 },
                          { metric: "Engagement", value: Math.min(avgComments * 10, 100), fullMark: 100 },
                          { metric: "Contributors", value: Math.min(data.info.num_contributors * 2, 100), fullMark: 100 }
                        ];

                        return <RadarChart data={radarData} />;
                      })()}
                    </div>
                  </Card>

                  {/* Issue Resolution Funnel */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Issue Resolution Funnel</h3>
                    <div className="h-[400px]">
                      {(() => {
                        const total = data.issues.length;
                        const withComments = data.issues.filter(i => i.comments > 0).length;
                        const closed = data.issues.filter(i => i.state === 'closed').length;
                        const quickClose = data.issues.filter(i => i.state === 'closed' && i.time_to_close && i.time_to_close <= 7).length;

                        const funnelData = [
                          { stage: "Total Issues", value: total },
                          { stage: "With Discussion", value: withComments },
                          { stage: "Resolved", value: closed },
                          { stage: "Quick Resolution (<7d)", value: quickClose }
                        ];

                        return <FunnelChart data={funnelData} height={350} />;
                      })()}
                    </div>
                  </Card>

                  {/* Scatter Plot Matrix */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Time to Close vs Comments</h3>
                    <div className="h-[350px]">
                      {(() => {
                        const scatterData = data.issues
                          .filter(issue => issue.time_to_close !== null)
                          .map(issue => ({
                            timeToClose: issue.time_to_close!,
                            comments: issue.comments,
                            state: issue.state,
                            title: issue.title
                          }));

                        return <ScatterPlotMatrix data={scatterData} />;
                      })()}
                    </div>
                  </Card>

                  {/* Timeline Chart */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Issue Resolution Timeline</h3>
                    <div className="h-[350px]">
                      {(() => {
                        const timelineData = data.issues
                          .filter(issue => issue.time_to_close !== null)
                          .slice(-20)
                          .map(issue => ({
                            title: issue.title.length > 40 ? issue.title.substring(0, 40) + '...' : issue.title,
                            start: 0,
                            duration: issue.time_to_close!,
                            state: issue.state
                          }));

                        return timelineData.length > 0 ? (
                          <TimelineChart data={timelineData} />
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            No closed issues available
                          </div>
                        );
                      })()}
                    </div>
                  </Card>

                  {/* Collaboration Matrix */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Contributor Collaboration Matrix</h3>
                    <p className="text-xs text-muted-foreground mb-2">Collaboration based on shared labels</p>
                    <div className="h-[400px]">
                      {(() => {
                        // Build collaboration matrix: users who use similar labels (work on similar topics)
                        const contributorCounts = new Map<string, number>();
                        data.issues.forEach(issue => {
                          contributorCounts.set(issue.user, (contributorCounts.get(issue.user) || 0) + 1);
                        });

                        // Get top 10 contributors by issue count
                        const topContributors = Array.from(contributorCounts.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([user]) => user);

                        // Create a map of labels each contributor uses
                        const contributorLabels = new Map<string, Map<string, number>>();
                        data.issues.forEach(issue => {
                          if (!contributorLabels.has(issue.user)) {
                            contributorLabels.set(issue.user, new Map());
                          }
                          const labelMap = contributorLabels.get(issue.user)!;
                          issue.labels.forEach(label => {
                            labelMap.set(label, (labelMap.get(label) || 0) + 1);
                          });
                        });

                        // Calculate collaboration scores based on shared labels
                        const collaborationData = topContributors.map(user1 => {
                          const user1Labels = contributorLabels.get(user1) || new Map();

                          return {
                            id: user1,
                            data: topContributors.map(user2 => {
                              if (user1 === user2) return { x: user2, y: 0 };

                              const user2Labels = contributorLabels.get(user2) || new Map();

                              // Count shared labels (weighted by frequency)
                              let sharedScore = 0;
                              user1Labels.forEach((count1, label) => {
                                if (user2Labels.has(label)) {
                                  const count2 = user2Labels.get(label)!;
                                  sharedScore += Math.min(count1, count2);
                                }
                              });

                              return { x: user2, y: sharedScore };
                            })
                          };
                        });

                        return topContributors.length > 1 ? (
                          <CollaborationMatrix data={collaborationData} />
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            Need multiple contributors for collaboration matrix
                          </div>
                        );
                      })()}
                    </div>
                  </Card>

                  {/* Sankey Diagram */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Issue Label Flow</h3>
                    <div className="h-[400px]">
                      {(() => {
                        // Build Sankey data: Labels -> States
                        const labelStateMap = new Map<string, Map<string, number>>();

                        data.issues.forEach(issue => {
                          if (issue.labels && issue.labels.length > 0) {
                            issue.labels.forEach(label => {
                              if (!labelStateMap.has(label)) {
                                labelStateMap.set(label, new Map());
                              }
                              const stateMap = labelStateMap.get(label)!;
                              stateMap.set(issue.state, (stateMap.get(issue.state) || 0) + 1);
                            });
                          }
                        });

                        // Get top 5 labels
                        const topLabels = Array.from(labelStateMap.entries())
                          .sort((a, b) => {
                            const aTotal = Array.from(a[1].values()).reduce((sum, val) => sum + val, 0);
                            const bTotal = Array.from(b[1].values()).reduce((sum, val) => sum + val, 0);
                            return bTotal - aTotal;
                          })
                          .slice(0, 5);

                        // Build nodes and links
                        const nodes: { name: string }[] = [];
                        const nodeMap = new Map<string, number>();

                        // Add label nodes
                        topLabels.forEach(([label]) => {
                          nodeMap.set(label, nodes.length);
                          nodes.push({ name: label });
                        });

                        // Add state nodes
                        ['open', 'closed'].forEach(state => {
                          nodeMap.set(state, nodes.length);
                          nodes.push({ name: state });
                        });

                        // Build links
                        const links: { source: number; target: number; value: number }[] = [];
                        topLabels.forEach(([label, stateMap]) => {
                          const labelIdx = nodeMap.get(label)!;
                          stateMap.forEach((count, state) => {
                            const stateIdx = nodeMap.get(state)!;
                            links.push({ source: labelIdx, target: stateIdx, value: count });
                          });
                        });

                        return topLabels.length > 0 ? (
                          <SankeyChart data={{ nodes, links }} />
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            No labeled issues available
                          </div>
                        );
                      })()}
                    </div>
                  </Card>

                  {/* Violin Plot */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Time to Close Distribution</h3>
                    <div className="h-[400px]">
                      {(() => {
                        const openIssues = data.issues
                          .filter(i => i.state === 'open' && i.time_to_close !== null)
                          .map(i => i.time_to_close!);

                        const closedIssues = data.issues
                          .filter(i => i.state === 'closed' && i.time_to_close !== null)
                          .map(i => i.time_to_close!);

                        const violinData = [
                          { category: 'Open', values: openIssues },
                          { category: 'Closed', values: closedIssues }
                        ].filter(d => d.values.length > 0);

                        return violinData.length > 0 ? (
                          <ViolinPlot data={violinData} />
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            No time-to-close data available
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {data && (
            <>
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Text Analysis</h2>
                <div className="mb-6">
                  <RadioGroup 
                    defaultValue="title" 
                    className="flex space-x-4"
                    onValueChange={(value) => {
                      if (value === 'title' || value === 'body') {
                        loadTextAnalysisData(value);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="title" id="topic_title" />
                      <Label htmlFor="topic_title">Title</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="body" id="topic_body" />
                      <Label htmlFor="topic_body">Body</Label>
                    </div>
                  </RadioGroup>
                </div>

                {isTextAnalysisLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Word Cloud</h3>
                      {wordCloudData?.wordcloud?.words ? (
                        <div className="h-[300px] border rounded-lg p-4 relative overflow-hidden">
                          {/* Word cloud visualization */}
                          <div className="absolute inset-0">
                            {memoizedWordCloudData.map((word: { text: string; value: number }, index: number) => {
                              // Array of font families for variety
                              const fonts = [
                                'system-ui',
                                'Arial',
                                'Helvetica',
                                'sans-serif',
                                'Verdana',
                                'Trebuchet MS',
                                'Tahoma',
                                'Georgia',
                                'Garamond',
                                'Courier New'
                              ];

                              // Get a font based on the word (consistent for same words)
                              const fontIndex = word.text.length % fonts.length;
                              const fontFamily = fonts[fontIndex];

                              // Calculate font size based on relative frequency
                              // Find min and max values for proper scaling
                              const values = memoizedWordCloudData.map((w: { value: number }) => w.value);
                              const maxValue = Math.max(...values);
                              const minValue = Math.min(...values);
                              const normalizedValue = maxValue > minValue
                                ? (word.value - minValue) / (maxValue - minValue)
                                : 0.5;
                              // Scale font size from 0.8rem to 4rem based on normalized frequency
                              const fontSize = 0.8 + (normalizedValue * 3.2);

                              // Varied color palette with more hue variety
                              const colorPalettes = [
                                { hue: 210, satRange: [60, 85], lightRange: [45, 65] }, // Blue
                                { hue: 195, satRange: [65, 90], lightRange: [40, 60] }, // Cyan
                                { hue: 230, satRange: [55, 80], lightRange: [50, 70] }, // Indigo
                                { hue: 180, satRange: [60, 85], lightRange: [40, 55] }, // Teal
                                { hue: 250, satRange: [50, 75], lightRange: [55, 75] }, // Purple-Blue
                                { hue: 200, satRange: [70, 95], lightRange: [35, 55] }, // Deep Blue
                              ];

                              // Select color palette based on word hash
                              const hashCode = word.text.split('').reduce((a, b) => {
                                a = ((a << 5) - a) + b.charCodeAt(0);
                                return a & a;
                              }, 0);
                              const paletteIndex = Math.abs(hashCode) % colorPalettes.length;
                              const palette = colorPalettes[paletteIndex];

                              // Vary saturation and lightness based on frequency
                              const saturation = palette.satRange[0] + (normalizedValue * (palette.satRange[1] - palette.satRange[0]));
                              const lightness = palette.lightRange[1] - (normalizedValue * (palette.lightRange[1] - palette.lightRange[0]));

                              // Consistent rotation based on the word
                              const rotation = (word.text.charCodeAt(0) % 40) - 20;

                              // Deterministic but scattered position
                              const top = Math.abs(hashCode % 70) + 15;
                              const left = Math.abs((hashCode * 13) % 70) + 15;

                              return (
                                <div
                                  key={index}
                                  className="absolute"
                                  style={{
                                    fontFamily,
                                    fontSize: `${fontSize}rem`,
                                    fontWeight: normalizedValue > 0.6 ? 'bold' : 'normal',
                                    opacity: Math.min(Math.max(0.7 + normalizedValue * 0.3, 0.6), 1),
                                    top: `${top}%`,
                                    left: `${left}%`,
                                    transform: `rotate(${rotation}deg)`,
                                    color: `hsl(${palette.hue}, ${saturation}%, ${lightness}%)`,
                                    zIndex: Math.floor(normalizedValue * 100),
                                    textShadow: normalizedValue > 0.7 ? '1px 1px 3px rgba(0,0,0,0.15)' : 'none',
                                    transition: 'all 0.3s ease-in-out',
                                    willChange: 'transform', // Optimize for animations
                                  }}
                                >
                                  {word.text}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[300px] border rounded-lg p-4 flex items-center justify-center">
                          <p className="text-muted-foreground">No word cloud data available</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">Word Frequency</h3>
                      {wordCloudData?.treemap?.children ? (
                        <div className="h-[300px] border rounded-lg p-4">
                          <TreeMap
                            data={memoizedTreeMapData}
                            title="Top Words"
                            colors={['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']}
                          />
                        </div>
                      ) : (
                        <div className="h-[300px] border rounded-lg p-4 flex items-center justify-center">
                          <p className="text-muted-foreground">No word frequency data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Topic Modeling</h2>
                {isTopicModelingLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : topicData?.topics ? (
                  <div className="space-y-6">
                    <div className="border rounded-lg p-4 bg-muted/40">
                      <h3 className="text-lg font-medium mb-2">Topic Labels</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {memoizedTopicLabels.map((topic) => (
                          <div key={topic.id} className="bg-background p-3 rounded-md border">
                            <h4 className="font-medium">Topic {topic.id + 1}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {topic.words.map(w => w.text).join(", ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                        {memoizedTopicCharts.map((topic) => (
                          <div key={topic.id} className="flex flex-col min-h-[280px]">
                            <h4 className="font-medium text-center mb-1">Topic {topic.id + 1}</h4>
                            <p className="text-xs text-center text-muted-foreground mb-2">
                              {topic.words.slice(0, 3).map(w => w.name).join(", ")}
                            </p>
                            <div className="flex-1 min-h-[200px]">
                              <PieChart data={topic.words} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Advanced Topic Visualization</h3>
                      <div className="p-2 bg-muted/20 rounded-lg mb-4">
                        <p className="text-sm text-muted-foreground">
                          This interactive visualization helps you explore the topics in more detail. 
                          Topics are shown as circles, with size representing prevalence. 
                          Hover over terms on the right to see their distribution across topics.
                          Adjust the λ slider to focus on more exclusive (left) or common (right) terms.
                        </p>
                      </div>
                      {repo && (
                        <PyLDAVisViewer 
                          repoName={decodeURIComponent(repo)} 
                          field={currentAnalysisField || 'title'} 
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No topic modeling data available</p>
                  </div>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="experimental" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {/* Chat Interface */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Chat with Issues</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask questions about the GitHub issues.
              </p>
              {data && repo && (
                <ChatInterface repoName={decodeURIComponent(repo)} />
              )}
            </div>

            {/* Nomic Atlas Analysis */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nomic Atlas Topic Analysis</h3>
                <div className="flex items-center gap-2">
                  {dataSource && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <span className="mr-1">Source:</span>
                      <span className={`px-2 py-1 rounded-full ${
                        dataSource === 'cache' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {dataSource === 'cache' ? 'Cache (refreshed weekly)' : 'API'}
                      </span>
                    </div>
                  )}
                  <Button 
                    onClick={() => loadNomicAtlasTopicData(currentAnalysisField)}
                    disabled={isNomicTopicsLoading}
                    variant="default"
                    className="ml-2"
                  >
                    {isNomicTopicsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run Analysis
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                <RadioGroup
                  value={currentAnalysisField}
                  onValueChange={setCurrentAnalysisField}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="title" id="title-field-nomic" />
                    <Label htmlFor="title-field-nomic">Title</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="body" id="body-field-nomic" />
                    <Label htmlFor="body-field-nomic">Body</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {isNomicTopicsLoading ? (
                <div className="flex flex-col justify-center items-center h-64 bg-gray-50 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
                  <span className="text-gray-500 text-center">
                    Running topic analysis...<br />
                    <span className="text-xs text-gray-400">
                      This may take a few minutes for larger repositories
                    </span>
                  </span>
                </div>
              ) : error && error.includes("Nomic Atlas") ? (
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-md">
                  <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                  <h4 className="text-lg font-medium text-red-800">Error Loading Nomic Atlas Data</h4>
                  <p className="text-center text-red-600 mt-2">{error}</p>
                  
                  {error.includes("Retrying in") ? (
                    <div className="mt-4 w-full max-w-md">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-gray-100 rounded-md w-full max-w-2xl">
                      <h5 className="font-medium mb-2">Possible Solutions:</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Check if the Nomic package is properly installed on the backend</li>
                        <li>Verify that a valid Nomic API key is provided</li>
                        <li>Ensure compatibility between Nomic and other dependencies</li>
                        {error.includes("Dataset is locked") && (
                          <li>The dataset is currently being processed by Nomic Atlas. Try again in a few minutes.</li>
                        )}
                      </ul>
                      
                      <Button 
                        className="mt-4 w-full" 
                        variant="outline"
                        onClick={() => loadNomicAtlasTopicData(currentAnalysisField)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              ) : nomicTopicData ? (
                'error' in nomicTopicData && nomicTopicData.error ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-md">
                    <AlertCircle className="h-10 w-10 text-yellow-500 mb-2" />
                    <h4 className="text-lg font-medium text-yellow-800">Nomic Atlas Error</h4>
                    <p className="text-center text-yellow-600 mt-2">{nomicTopicData.error}</p>
                  </div>
                ) : nomicTopicData?.status === "processing" || nomicTopicData?.status === "timeout" ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-md">
                    {nomicTopicData?.status === "processing" ? (
                      <>
                        <Loader2 className="h-10 w-10 text-blue-500 mb-2 animate-spin" />
                        <h4 className="text-lg font-medium text-blue-800">Processing Topics</h4>
                        <p className="text-center text-blue-600 mt-2">
                          Nomic Atlas is still processing your topics. This may take a few minutes for larger repositories.
                        </p>
                        <Button 
                          className="mt-4" 
                          variant="outline"
                          onClick={() => loadNomicAtlasTopicData(currentAnalysisField)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Check Again
                        </Button>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                        <h4 className="text-lg font-medium text-amber-800">Processing Timeout</h4>
                        <p className="text-center text-amber-600 mt-2">
                          {nomicTopicData?.message || "Timed out waiting for topics to be generated. Try again later or with a smaller dataset."}
                        </p>
                        <Button 
                          className="mt-4" 
                          variant="outline"
                          onClick={() => loadNomicAtlasTopicData(currentAnalysisField)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Topic Cards with Labels */}
                    {nomicTopicData?.topics && nomicTopicData.topics.length > 0 ? (
                      <div>
                        <h4 className="text-md font-medium mb-4">Discovered Topics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {nomicTopicData.topics
                            .filter((topic: any) => topic.topic_depth_1) // Only show topics with depth 1 labels
                            .reduce((acc: any[], topic: any) => {
                              // Group by topic_depth_1 to show unique topics
                              const existingTopic = acc.find((t: any) => t.topic_depth_1 === topic.topic_depth_1);
                              if (!existingTopic) {
                                acc.push(topic);
                              }
                              return acc;
                            }, [])
                            .slice(0, 12) // Show top 12 unique topics
                            .map((topic: any, index: number) => (
                              <div
                                key={index}
                                className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-blue-900 flex-1">
                                    {topic.topic_depth_1 || `Topic ${index + 1}`}
                                  </h5>
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                    {nomicTopicData.topic_counts?.topic_depth_1?.[topic.topic_depth_1] || 0}
                                  </span>
                                </div>
                                {topic.topic_depth_2 && (
                                  <p className="text-sm text-blue-700 mb-2">
                                    → {topic.topic_depth_2}
                                  </p>
                                )}
                                {topic.topic_depth_3 && (
                                  <p className="text-xs text-blue-600 italic">
                                    → {topic.topic_depth_3}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-4">
                          Showing {Math.min(12, nomicTopicData.topics.filter((t: any) => t.topic_depth_1).reduce((acc: any[], topic: any) => {
                            const exists = acc.find((t: any) => t.topic_depth_1 === topic.topic_depth_1);
                            if (!exists) acc.push(topic);
                            return acc;
                          }, []).length)} unique topics
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-500">No topic data available.</p>
                      </div>
                    )}

                    {/* Topic Distribution */}
                    {nomicTopicData?.topic_counts?.topic_depth_1 && Object.keys(nomicTopicData.topic_counts.topic_depth_1).length > 0 ? (
                      <div>
                        <h4 className="text-md font-medium mb-4">Topic Distribution</h4>
                        <div className="bg-white p-4 rounded-lg border">
                          <BarChart
                            data={Object.entries(nomicTopicData.topic_counts.topic_depth_1)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .slice(0, 10)
                              .map(([name, value]) => ({ name, value }))}
                            xKey="name"
                            yKey="value"
                            title="Number of Issues per Topic"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No Nomic Atlas topic data available. Try selecting a different field or refreshing the data.
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 