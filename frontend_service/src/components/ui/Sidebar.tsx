import React from "react";
import { BarChart, GitBranch, GitPullRequest, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  isActive?: boolean;
}

function SidebarItem({ icon: Icon, title, href, isActive }: SidebarItemProps) {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </Link>
  );
}

export function Sidebar() {
  // In a real app, you would determine active based on current route
  const isActive = (path: string) => path === "/";

  return (
    <div className="pb-12">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              icon={BarChart} 
              title="Overview" 
              href="/" 
              isActive={isActive("/")} 
            />
            <SidebarItem 
              icon={GitBranch} 
              title="Repositories" 
              href="/repositories" 
              isActive={isActive("/repositories")} 
            />
            <SidebarItem 
              icon={GitPullRequest} 
              title="Pull Requests" 
              href="/pull-requests" 
              isActive={isActive("/pull-requests")} 
            />
            <SidebarItem 
              icon={Users} 
              title="Contributors" 
              href="/contributors" 
              isActive={isActive("/contributors")} 
            />
          </div>
        </div>
      </div>
    </div>
  );
} 