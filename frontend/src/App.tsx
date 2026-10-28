import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./app/ThemeContext";
import { AuthProvider } from "./app/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { AppRoutes } from "./app/AppRoutes";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
