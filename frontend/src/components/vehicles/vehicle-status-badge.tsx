

import * as React from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { VEHICLE_STATUS } from "@/lib/status-config";
import type { VehicleStatus } from "@/lib/types";

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const cfg = VEHICLE_STATUS[status];
  return (
    <StatusBadge label={cfg.label} color={cfg.color} withDot />
  );
}
