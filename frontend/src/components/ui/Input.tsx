import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1.5"
          >
            {label}
            {props.required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-light-secondary dark:text-dark-secondary pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                "w-full rounded-lg text-sm px-3.5 py-2.5 transition-colors",
                "bg-white dark:bg-dark-card text-light-primary dark:text-dark-primary",
                "border border-light-border dark:border-dark-border",
                "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                "focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                leftIcon && "pl-10",
                rightIcon && "pr-10",
                error && "border-status-error focus:border-status-error focus:ring-status-error",
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-light-secondary dark:text-dark-secondary">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-status-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-light-secondary dark:text-dark-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
