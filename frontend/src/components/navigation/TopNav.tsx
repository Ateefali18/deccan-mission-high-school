import React from "react";
import { Menu, Calendar } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeSelector } from "../ui/ThemeSelector";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../../app/AuthContext";

interface TopNavProps {
  onOpenMobileSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobileSidebar }) => {
  const { session } = useAuth();

  return (
    <header className="sticky top-0 z-20 w-full h-16 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md border-b border-light-border dark:border-dark-border px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-light-secondary dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Academic Year Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-gold/10 text-brand-gold border border-brand-gold/30 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          <span>AY 2025–2026</span>
        </div>

        {/* Theme Switcher */}
        <ThemeSelector compact />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
};
