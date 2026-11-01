import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, elevated = false, className, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          "rounded-xl border transition-all duration-150",
          elevated
            ? "bg-white dark:bg-dark-elevated border-light-border dark:border-dark-border shadow-md"
            : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border shadow-card",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
