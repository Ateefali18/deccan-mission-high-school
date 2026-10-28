import React from "react";
import { Breadcrumbs } from "../navigation/Breadcrumbs";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  showBreadcrumbs = true,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-light-border dark:border-dark-border mb-6">
      <div className="space-y-1">
        {showBreadcrumbs && <Breadcrumbs />}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-light-primary dark:text-dark-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-light-secondary dark:text-dark-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
};
