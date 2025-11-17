import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { LDAVisViewer } from './LDAVisViewer';

interface PyLDAVisViewerProps {
  repoName: string;
  field: string;
  apiUrl?: string;
}

export function PyLDAVisViewer({ repoName, field, apiUrl }: PyLDAVisViewerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState<number>(0);
  const [ldaData, setLdaData] = useState<any>(null);
  const baseApiUrl = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const encodedRepo = encodeURIComponent(repoName);

  // Load the LDA data for our custom visualization
  useEffect(() => {
    const loadLdaData = async () => {
      try {
        console.log('Fetching LDA data...');
        const response = await fetch(`${baseApiUrl}/visualize/topics-from-ldavis?repo=${encodedRepo}&field=${field}${loadAttempts > 0 ? '&force_refresh=true' : ''}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Received LDA data:', data);
          
          // More robust data validation to handle partial data
          if (data.topics || (data.terms && data.term_frequency && data.topic_term_dists)) {
            console.log('Setting LDA data from API');
            
            // Ensure the data structure is complete with required fields
            const normalizedData = {
              topics: data.topics || [],
              terms: data.terms || [],
              term_frequency: data.term_frequency || [],
              topic_term_dists: data.topic_term_dists || []
            };
            
            // Validate that arrays have content
            if (normalizedData.topics.length === 0 && data.error) {
              setError(data.error);
              setLdaData(null);
            } else {
              setLdaData(normalizedData);
            }
          } else if (data.error) {
            console.error('LDA data error:', data.error);
            setError(data.error);
          } else {
            console.error('Invalid LDA data format:', data);
            setError('Invalid data format received from server');
          }
        } else {
          console.error('API response not OK:', response.status, response.statusText);
          setError(`Server error: ${response.status} ${response.statusText}`);
        }
        setIsLoading(false);
      } catch (e: unknown) {
        console.error('Error loading LDA data:', e);
        const errorMessage = e instanceof Error ? e.message : 'Failed to load topic visualization data';
        setError(errorMessage);
        setIsLoading(false);
      }
    };
    setIsLoading(true);
    setError(null);
    loadLdaData();
  }, [baseApiUrl, encodedRepo, field, loadAttempts]);

  // Set up timeout to detect if loading takes too long
  useEffect(() => {
    if (!isLoading) return;
    
    const timeoutId = setTimeout(() => {
      if (isLoading && loadAttempts < 3) {
        console.log(`Loading timeout (attempt ${loadAttempts + 1}), refreshing visualization...`);
        setLoadAttempts(prev => prev + 1);
      } else if (isLoading) {
        setError("Visualization is taking too long to load. There might be an issue with the data or server.");
        setIsLoading(false);
      }
    }, 20000); // 20 second timeout
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, loadAttempts]);
  
  // Handle refresh
  const handleRefresh = () => {
    setLoadAttempts(prev => prev + 1);
    setIsLoading(true);
    setError(null);
    setLdaData(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground mt-4">
            {loadAttempts > 0 ? `Loading attempt ${loadAttempts + 1}...` : 'Loading topic visualization...'}
          </div>
          {loadAttempts > 1 && (
            <div className="text-xs text-muted-foreground max-w-md text-center mt-2">
              This visualization requires processing all repository issues and may take some time to generate.
            </div>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-destructive gap-4">
          <p>{error}</p>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      );
    }

    if (!ldaData) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-destructive gap-4">
          <p>No topic data available. Check the console for details.</p>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Visualization
          </button>
        </div>
      );
    }

    return (
      <div className="p-4">
        <LDAVisViewer data={ldaData} />
      </div>
    );
  };

  return (
    <div className="w-full h-[600px] overflow-hidden border rounded-lg bg-white">
      <div className="flex justify-end p-2 border-b">
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
          title="Regenerate visualization"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Refresh
            </>
          )}
        </button>
      </div>
      <div className="p-4 h-[550px] overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
} 