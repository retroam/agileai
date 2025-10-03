import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, Github } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="border-b sticky top-0 z-10 bg-background h-16">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-2 lg:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Github className="h-6 w-6" />
          <h1 className="text-xl font-bold">GitHub Repository Analyzer</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a 
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
} 