import React from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-blue dark:focus-visible:outline-dark-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variants = {
    primary:
      "bg-brand-blue text-white hover:bg-brand-blueHover active:bg-[#1E40AF] shadow-sm",
    secondary:
      "bg-white dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card shadow-sm",
    outline:
      "border border-brand-blue text-brand-blue dark:border-dark-accent dark:text-dark-accent hover:bg-brand-blue/10 active:bg-brand-blue/20",
    destructive:
      "bg-status-error text-white hover:bg-red-800 active:bg-red-900 shadow-sm",
    ghost:
      "text-light-secondary dark:text-dark-secondary hover:text-light-primary dark:hover:text-dark-primary hover:bg-black/5 dark:hover:bg-white/5",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 min-h-[34px] gap-1.5",
    md: "text-sm px-4 py-2 min-h-[40px] gap-2",
    lg: "text-base px-5 py-2.5 min-h-[44px] gap-2.5",
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
