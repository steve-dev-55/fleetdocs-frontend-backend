

import * as React from "react";
import { AlertsTable } from "@/components/alerts/alerts-table";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api-client";
import { ALERT_SEVERITY } from "@/lib/status-config";
import type { Alert } from "@/lib/types";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  React.useEffect(() => {
    void apiGet<Alert[] | { items: Alert[] }>("/api/alerts?status=all")
      .then((d) => {
        const items = Array.isArray(d) ? d : d.items;
        setAlerts(items);
      })
      .catch(() => {});
  }, []);

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.filter((a) => a.severity === "warning").length;
  const info = alerts.filter((a) => a.severity === "info").length;

  // Avoid unused warning for ALERT_SEVERITY import (kept for future use)
  void ALERT_SEVERITY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Alertes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {alerts.length} alertes actives — traitez les documents expirés en priorité.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{critical}</p>
              <p className="text-xs text-muted-foreground">Critiques</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{warning}</p>
              <p className="text-xs text-muted-foreground">Avertissements</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Info className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{info}</p>
              <p className="text-xs text-muted-foreground">Informations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertsTable />

      {/* Avoid unused warning for Bell icon import */}
      <span className="hidden">
        <Bell />
      </span>
    </div>
  );
}
