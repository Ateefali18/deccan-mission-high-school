import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "../../app/ThemeContext";
import type { ThemeMode } from "../../types";

export const ThemeSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { mode: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { mode: "system", label: "System", icon: <Laptop className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center p-1 rounded-lg bg-gray-100 dark:bg-dark-elevated border border-light-border dark:border-dark-border" role="group" aria-label="Theme mode switch">
      {options.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            onClick={() => setTheme(opt.mode)}
            title={`Switch to ${opt.label} mode`}
            aria-label={`Switch to ${opt.label} mode`}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? "bg-white dark:bg-dark-card text-brand-blue dark:text-dark-accent shadow-sm font-semibold"
                : "text-light-secondary dark:text-dark-secondary hover:text-light-primary dark:hover:text-dark-primary"
            }`}
          >
            {opt.icon}
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
