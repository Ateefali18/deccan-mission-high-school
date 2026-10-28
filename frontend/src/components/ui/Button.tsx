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
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary:
      "bg-brand-gold text-brand-midnight hover:bg-brand-goldHover active:bg-brand-goldPressed font-semibold shadow-sm",
    secondary:
      "bg-light-card dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-slate-700/60 shadow-sm",
    outline:
      "border border-brand-gold text-brand-gold hover:bg-brand-gold/10 active:bg-brand-gold/20",
    destructive:
      "bg-status-error text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
    ghost:
      "text-light-secondary dark:text-dark-secondary hover:text-light-primary dark:hover:text-dark-primary hover:bg-black/5 dark:hover:bg-white/5",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-5 py-2.5 gap-2.5",
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
