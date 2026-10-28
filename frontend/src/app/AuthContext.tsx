import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CurrentUserSession, UserRole } from "../types";
import { api } from "../services/api";

interface AuthContextType {
  session: CurrentUserSession | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username_or_email: string, pass: string) => Promise<CurrentUserSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CurrentUserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem("dmhs_token");
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.auth.getMe();
      setSession(data);
    } catch (err) {
      localStorage.removeItem("dmhs_token");
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (username_or_email: string, pass: string): Promise<CurrentUserSession> => {
    setIsLoading(true);
    try {
      await api.auth.login(username_or_email, pass);
      const userSession = await api.auth.getMe();
      setSession(userSession);
      return userSession;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } finally {
      setSession(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        role: session?.role || null,
        isLoading,
        isAuthenticated: !!session,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
