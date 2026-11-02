import React, { createContext, useContext, useEffect, useState } from "react";
import type { ThemeMode } from "../types";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("dmhs_theme") as ThemeMode | null;
        return saved || "system";
      }
    } catch {
      // Fallback for restricted or testing environments
    }
    return "system";
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !document?.documentElement) return;
    const root = document.documentElement;
    const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    const applyTheme = () => {
      let activeIsDark = false;
      if (theme === "dark") {
        activeIsDark = true;
      } else if (theme === "light") {
        activeIsDark = false;
      } else {
        activeIsDark = mediaQuery ? mediaQuery.matches : false;
      }

      setIsDark(activeIsDark);
      if (activeIsDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (mediaQuery?.addEventListener) {
      const listener = () => {
        if (theme === "system") {
          applyTheme();
        }
      };

      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("dmhs_theme", mode);
      }
    } catch {
      // Ignore in non-browser envs
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
