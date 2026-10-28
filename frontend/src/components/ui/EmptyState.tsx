import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-light-border dark:border-dark-border bg-white/40 dark:bg-dark-card/40 my-4">
      <div className="p-3.5 rounded-full bg-brand-gold/10 text-brand-gold mb-3">
        {icon || <FolderOpen className="w-8 h-8" />}
      </div>
      <h4 className="text-base font-bold text-light-primary dark:text-dark-primary mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-light-secondary dark:text-dark-secondary max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
