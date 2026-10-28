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
            {props.required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            clsx(
              "w-full rounded-lg text-sm px-3.5 py-2.5 transition-colors appearance-none bg-no-repeat",
              "bg-white dark:bg-dark-card text-light-primary dark:text-dark-primary",
              "border border-light-border dark:border-dark-border",
              "focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error && "border-status-error focus:border-status-error focus:ring-status-error",
              className
            )
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="dark:bg-dark-card dark:text-dark-primary">
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-status-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-light-secondary dark:text-dark-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
