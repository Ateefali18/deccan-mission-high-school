import React from "react";
import { Card } from "../ui/Card";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  subtitle,
  trend,
  className,
}) => {
  return (
    <Card
      className={twMerge(
        clsx(
          "p-5 hover:border-brand-blue/40 dark:hover:border-dark-accent/40 transition-all hover:shadow-md group relative overflow-hidden",
          className
        )
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-light-primary dark:text-dark-primary tracking-tight">
            {value}
          </p>
          {(subtitle || trend) && (
            <p className="text-xs text-light-secondary dark:text-dark-secondary flex items-center gap-1.5 pt-1">
              {trend && (
                <span className="text-status-success font-semibold">{trend}</span>
              )}
              {subtitle && <span>{subtitle}</span>}
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-dark-accent border border-brand-blue/20 group-hover:scale-110 transition-transform shrink-0">
          {icon}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
};
