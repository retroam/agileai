import React from "react";
import { Github } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <Github className="h-6 w-6" />
            <span className="inline-block font-bold">GitHub Repository Analyzer</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {/* Add navigation items or user profile here if needed */}
          </nav>
        </div>
      </div>
    </header>
  );
} 