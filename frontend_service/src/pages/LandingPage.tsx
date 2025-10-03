import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LandingPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with:', repoUrl);
    
    if (!repoUrl.trim()) {
      alert('Please enter a repository URL or name');
      return;
    }
    
    // Extract owner/repo from URL or use as is if in that format
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/) || repoUrl.match(/^([^/]+\/[^/]+)$/);
    
    if (match && match[1]) {
      const repoPath = match[1];
      console.log('Extracted repo path:', repoPath);
      console.log('Navigating to:', `/analyze/${encodeURIComponent(repoPath)}`);
      
      setIsLoading(true);
      
      // Navigate to the analysis page
      navigate(`/analyze/${encodeURIComponent(repoPath)}`);
    } else {
      console.error('Invalid repository format');
      alert('Please enter a valid GitHub repository URL or owner/repo format (e.g., facebook/react)');
    }
  };

  const handleTestNavigation = () => {
    const testRepo = 'facebook/react';
    console.log('Test navigation to:', testRepo);
    setIsLoading(true);
    navigate(`/analyze/${encodeURIComponent(testRepo)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="space-y-2">
          <Github className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold tracking-tighter">GitHub Repository Analyzer</h1>
          <p className="text-muted-foreground">
            Enter a GitHub repository URL or owner/repo to analyze its metrics and insights.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="e.g., facebook/react or https://github.com/facebook/react"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full"
            autoFocus
            disabled={isLoading}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Analyze Repository'
            )}
          </Button>
        </form>
        
        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={handleTestNavigation}
            className="text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Test with facebook/react'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 