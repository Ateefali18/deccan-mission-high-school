import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No records found.",
  onRowClick,
  className,
}: TableProps<T>) {
  return (
    <div
      className={twMerge(
        clsx(
          "w-full overflow-x-auto rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-card",
          className
        )
      )}
    >
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-light-border dark:border-dark-border bg-gray-50/80 dark:bg-dark-elevated/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={twMerge(
                  clsx(
                    "px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary select-none",
                    col.className
                  )
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-light-border dark:divide-dark-border">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-brand-blue dark:border-dark-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-light-muted dark:text-dark-muted font-medium">Loading records...</p>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-xs text-light-muted dark:text-dark-muted font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick && onRowClick(row)}
                className={twMerge(
                  clsx(
                    "hover:bg-brand-paleBlue/50 dark:hover:bg-dark-elevated/40 transition-colors",
                    onRowClick && "cursor-pointer"
                  )
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={twMerge(
                      clsx("px-4 py-3.5 text-xs sm:text-sm text-light-primary dark:text-dark-primary font-normal", col.className)
                    )}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
