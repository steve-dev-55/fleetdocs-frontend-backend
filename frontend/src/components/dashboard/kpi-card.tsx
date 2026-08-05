

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; direction: "up" | "down"; positive?: boolean };
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "green" | "amber" | "red" | "sky";
  description?: string;
}

const accentClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400" },
  green: { bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-600 dark:text-green-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  red: { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400" },
  sky: { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400" },
};

export function KpiCard({
  label,
  value,
  unit,
  trend,
  icon: Icon,
  accent = "blue",
  description,
}: KpiCardProps) {
  const a = accentClasses[accent];
  return (
    <div className="kpi-card group" style={{ '--accent-color': `var(--accent-${accent})` } as React.CSSProperties}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-display">
            {label}
          </p>
          <p className="mt-2 text-4xl font-bold text-foreground tracking-tight font-mono">
            {value}
            {unit && (
              <span className="ml-1.5 text-lg font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </p>
          {description && (
            <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium">
              {trend.direction === "up" ? (
                <ArrowUp
                  className={cn(
                    "size-3.5",
                    trend.positive ? "text-accent-green" : "text-accent-red"
                  )}
                />
              ) : (
                <ArrowDown
                  className={cn(
                    "size-3.5",
                    trend.positive ? "text-accent-green" : "text-accent-red"
                  )}
                />
              )}
              <span
                className={
                  trend.positive ? "text-accent-green" : "text-accent-red"
                }
              >
                {trend.value}%
              </span>
              <span className="text-muted-foreground font-normal">vs mois dernier</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "kpi-card__icon",
              a.text
            )}
          >
            <Icon className="size-6 relative z-10" />
          </div>
        )}
      </div>
    </div>
  );
}
