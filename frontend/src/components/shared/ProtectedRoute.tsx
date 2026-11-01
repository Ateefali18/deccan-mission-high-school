import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import type { UserRole } from "../../types";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { session, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
          Validating Security Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};
