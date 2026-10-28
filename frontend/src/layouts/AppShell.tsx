import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { TopNav } from "../components/navigation/TopNav";
import { SupabaseBanner } from "../components/shared/SupabaseBanner";

export const AppShell: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-light-bg dark:bg-dark-bg transition-colors">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onOpenMobileSidebar={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <SupabaseBanner />
          <Outlet />
        </main>

        <footer className="px-6 py-4 border-t border-light-border dark:border-dark-border text-center text-xs text-light-secondary dark:text-dark-secondary">
          <p>© 2026 Deccan Mission High School, Hyderabad. All Rights Reserved. • Cloud ERP Phase 2 (Supabase Connected)</p>
        </footer>
      </div>
    </div>
  );
};
