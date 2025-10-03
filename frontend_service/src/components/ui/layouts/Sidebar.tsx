import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Home,
  Github,
  Database,
  Search,
  LineChart,
  CloudCog,
  Lightbulb,
  X
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <Home className="h-5 w-5" />
  },
  {
    title: "Repository",
    href: "/repository",
    icon: <Github className="h-5 w-5" />
  },
  {
    title: "Issues",
    href: "/issues",
    icon: <Database className="h-5 w-5" />
  },
  {
    title: "Trends",
    href: "/trends",
    icon: <LineChart className="h-5 w-5" />
  },
  {
    title: "Statistics",
    href: "/statistics",
    icon: <BarChart className="h-5 w-5" />
  },
  {
    title: "Word Cloud",
    href: "/wordcloud",
    icon: <CloudCog className="h-5 w-5" />
  },
  {
    title: "Topic Modeling",
    href: "/topics",
    icon: <Lightbulb className="h-5 w-5" />
  }
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 bottom-0 z-30 w-64 border-r bg-background transition-transform lg:translate-x-0 lg:top-16 lg:bottom-0 lg:z-0",
          open ? "translate-x-0" : "-translate-x-full",
          !open && "lg:w-20"
        )}
      >
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="flex items-center justify-between border-b pb-2 lg:hidden">
            <h2 className="font-semibold">Navigation</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
              aria-label="Close Sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <nav className="grid gap-1">
              {navItems.map((item, index) => (
                <Button
                  key={index}
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start",
                    !open && "lg:justify-center"
                  )}
                  asChild
                >
                  <Link to={item.href}>
                    {item.icon}
                    <span className={cn("ml-2", !open && "lg:hidden")}>
                      {item.title}
                    </span>
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
} 