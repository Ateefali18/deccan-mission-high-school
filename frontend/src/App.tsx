import React, { Component, ErrorInfo, ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./app/ThemeContext";
import { AuthProvider } from "./app/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { AppRoutes } from "./app/AppRoutes";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global ErrorBoundary caught error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem("dmhs_token");
    localStorage.removeItem("dmhs_demo_role");
    localStorage.removeItem("dmhs_session_user");
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F6FA] dark:bg-[#101827] text-center">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-[#2563EB]/30 shadow-md mb-4 flex items-center justify-center">
            <img src="/dmhs-logo-128.png" alt="DMHS Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-[#142B4A] dark:text-white mb-2">
            Deccan Mission High School ERP
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mb-6">
            An unexpected application rendering issue occurred. You can reload the application without losing your login session.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-semibold text-sm shadow-md hover:bg-[#1D4ED8] transition-all cursor-pointer"
            >
              Reload Application
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-300 transition-all cursor-pointer"
            >
              Reset Session &amp; Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
