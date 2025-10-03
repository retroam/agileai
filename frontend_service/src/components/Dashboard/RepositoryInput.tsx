import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Github } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface RepositoryInputProps {
  initialRepo?: string;
  onAnalyze: (repo: string, token?: string) => Promise<void>;
  isLoading: boolean;
}

export function RepositoryInput({ initialRepo = "", onAnalyze, isLoading }: RepositoryInputProps) {
  const [repo, setRepo] = useState(initialRepo);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repo) {
      toast({
        variant: "destructive",
        title: "Repository is required",
        description: "Please enter a GitHub repository in the format owner/repo"
      });
      return;
    }

    if (!/^[\w-]+\/[\w-]+$/.test(repo)) {
      toast({
        variant: "destructive",
        title: "Invalid repository format",
        description: "Repository should be in the format owner/repo"
      });
      return;
    }

    try {
      await onAnalyze(repo, token || undefined);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze repository"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Repository Analysis
        </CardTitle>
        <CardDescription>
          Enter a GitHub repository to analyze its issues and pull requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo">GitHub Repository</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="repo"
                placeholder="owner/repository"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              For example: facebook/react
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token">GitHub Token (Optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="h-5 px-2 text-xs"
              >
                {showToken ? "Hide" : "Show"}
              </Button>
            </div>
            <Input
              id="token"
              type={showToken ? "text" : "password"}
              placeholder="Personal Access Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Increases API rate limits (required for private repositories)
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !repo}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Repository
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 