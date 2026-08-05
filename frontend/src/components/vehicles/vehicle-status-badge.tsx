

import * as React from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { VEHICLE_STATUS } from "@/lib/status-config";
import type { VehicleStatus } from "@/lib/types";

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  // Défensif : si le backend renvoie un statut inconnu du dictionnaire frontend,
  // on évite un crash en fournissant un fallback.
  const cfg = VEHICLE_STATUS[status] ?? {
    label: String(status ?? "Inconnu"),
    color: "gray" as const,
  };
  return (
    <StatusBadge label={cfg.label} color={cfg.color} withDot />
  );
}
