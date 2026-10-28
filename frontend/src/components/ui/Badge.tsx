import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "gold",
  size = "md",
  className,
}) => {
  const variants = {
    gold: "bg-brand-gold/15 text-brand-gold border border-brand-gold/30",
    success: "bg-status-success/15 text-status-success border border-status-success/30",
    warning: "bg-status-warning/15 text-status-warning border border-status-warning/30",
    error: "bg-status-error/15 text-status-error border border-status-error/30",
    info: "bg-status-info/15 text-status-info border border-status-info/30",
    neutral:
      "bg-gray-200 dark:bg-slate-700 text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border",
  };

  const sizes = {
    sm: "text-[11px] px-2 py-0.5 rounded-full font-medium",
    md: "text-xs px-2.5 py-1 rounded-full font-semibold",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1 uppercase tracking-wider",
          variants[variant],
          sizes[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
