import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "gold" | "success" | "warning" | "error" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  size = "md",
  className,
}) => {
  const variants = {
    primary:
      "bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-dark-accent border border-brand-blue/25",
    gold:
      "bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-dark-accent border border-brand-blue/25",
    success:
      "bg-emerald-500/10 text-status-success dark:text-status-darkSuccess dark:bg-emerald-500/15 border border-status-success/30 dark:border-status-darkSuccess/30",
    warning:
      "bg-amber-500/10 text-status-warning dark:text-status-darkWarning dark:bg-amber-500/15 border border-status-warning/30 dark:border-status-darkWarning/30",
    error:
      "bg-red-500/10 text-status-error dark:text-status-darkError dark:bg-red-500/15 border border-status-error/30 dark:border-status-darkError/30",
    danger:
      "bg-red-500/10 text-status-error dark:text-status-darkError dark:bg-red-500/15 border border-status-error/30 dark:border-status-darkError/30",
    info:
      "bg-sky-500/10 text-status-info dark:text-status-darkInfo dark:bg-sky-500/15 border border-status-info/30 dark:border-status-darkInfo/30",
    neutral:
      "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border",
  };

  const sizes = {
    sm: "text-[11px] px-2 py-0.5 rounded-full font-medium",
    md: "text-xs px-2.5 py-1 rounded-full font-semibold",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1 uppercase tracking-wider select-none",
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
