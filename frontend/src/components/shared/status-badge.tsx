

import * as React from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASSES, type ColorKey } from "@/lib/status-config";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  label: string;
  color: ColorKey;
  variant?: "solid" | "soft";
  className?: string;
  withDot?: boolean;
}

export function StatusBadge({
  label,
  color,
  variant = "soft",
  className,
  withDot = false,
}: StatusBadgeProps) {
  const c = COLOR_CLASSES[color];
  if (variant === "solid") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-white",
          c.bg,
          className
        )}
      >
        {withDot && <span className="size-1.5 rounded-full bg-white/80" />}
        {label}
      </span>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        c.text,
        c.border,
        c.bgSoft,
        className
      )}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", c.dot)} />}
      {label}
    </Badge>
  );
}

export type { ColorKey };
