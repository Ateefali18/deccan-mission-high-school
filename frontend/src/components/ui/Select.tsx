import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1.5"
          >
            {label}
            {props.required && <span className="text-status-error dark:text-status-darkError ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            clsx(
              "w-full rounded-lg text-sm px-3.5 py-2.5 min-h-[40px] transition-colors appearance-none bg-no-repeat",
              "bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary",
              "border border-light-border dark:border-dark-border",
              "focus:border-brand-blue dark:focus:border-dark-accent focus:ring-1 focus:ring-brand-blue dark:focus:ring-dark-accent focus:outline-none",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error && "border-status-error dark:border-status-darkError focus:border-status-error focus:ring-status-error",
              className
            )
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-dark-card text-light-primary dark:text-dark-primary">
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1.5 text-xs text-status-error dark:text-status-darkError font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-light-muted dark:text-dark-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
