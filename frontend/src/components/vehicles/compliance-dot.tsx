

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COMPLIANCE_LEVEL } from "@/lib/status-config";
import type { ComplianceLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ComplianceDotProps {
  level: ComplianceLevel;
  detail?: { valid: number; expiring: number; expired: number; total: number };
  size?: "sm" | "md";
}

const dotColor: Record<ComplianceLevel, string> = {
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

export function ComplianceDot({ level, detail, size = "md" }: ComplianceDotProps) {
  const cfg = COMPLIANCE_LEVEL[level];
  const sizeClass = size === "sm" ? "size-2" : "size-2.5";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center cursor-help">
            <span
              className={cn(
                "rounded-full ring-2 ring-background",
                dotColor[level],
                sizeClass
              )}
              aria-label={cfg.label}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">{cfg.label}</p>
            <p className="text-muted-foreground">{cfg.description}</p>
            {detail && (
              <div className="mt-2 space-y-0.5 text-[11px]">
                <p className="flex items-center justify-between gap-3">
                  <span>✓ Valides</span>
                  <span className="font-semibold">{detail.valid}/{detail.total}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-amber-600">⚠ À surveiller</span>
                  <span className="font-semibold">{detail.expiring}/{detail.total}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-red-600">✗ Expirés</span>
                  <span className="font-semibold">{detail.expired}/{detail.total}</span>
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
