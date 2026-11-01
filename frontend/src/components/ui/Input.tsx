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
            {props.required && <span className="text-status-error dark:text-status-darkError ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-light-muted dark:text-dark-muted pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                "w-full rounded-lg text-sm px-3.5 py-2.5 min-h-[40px] transition-colors",
                "bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary",
                "border border-light-border dark:border-dark-border",
                "placeholder:text-light-muted dark:placeholder:text-dark-muted",
                "focus:border-brand-blue dark:focus:border-dark-accent focus:ring-1 focus:ring-brand-blue dark:focus:ring-dark-accent focus:outline-none",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                leftIcon && "pl-10",
                rightIcon && "pr-10",
                error && "border-status-error dark:border-status-darkError focus:border-status-error focus:ring-status-error",
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-light-muted dark:text-dark-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-status-error dark:text-status-darkError font-medium flex items-center gap-1">
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-light-muted dark:text-dark-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
