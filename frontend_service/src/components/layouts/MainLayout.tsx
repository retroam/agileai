import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../../components/ui/Header";
import { Sidebar } from "../../components/ui/Sidebar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 