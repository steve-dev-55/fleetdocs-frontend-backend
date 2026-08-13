

import * as React from "react";
import { AlertsTable } from "@/components/alerts/alerts-table";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api-client";
import { ALERT_SEVERITY } from "@/lib/status-config";
import { useAlertEvents } from "@/hooks/use-alert-events";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function AlertsPage() {
  const [summary, setSummary] = React.useState<{
    total: number;
    active: number;
    resolved: number;
    by_severity: Record<string, number>;
  }>({ total: 0, active: 0, resolved: 0, by_severity: {} });

  const fetchSummary = React.useCallback(async () => {
    try {
      const data = await apiGet<{
        total: number;
        active: number;
        resolved: number;
        by_severity: Record<string, number>;
      }>("/api/alerts/summary");
      setSummary(data);
    } catch {
      // Keep previous data
    }
  }, []);

  React.useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // Re-fetch summary when an alert is resolved / created elsewhere
  useAlertEvents(() => {
    void fetchSummary();
  });

  const critical = summary.by_severity?.["critical"] ?? 0;
  const warning = summary.by_severity?.["warning"] ?? 0;
  const info = summary.by_severity?.["info"] ?? 0;
  const activeCount = summary.active ?? 0;

  // Avoid unused warning for ALERT_SEVERITY import (kept for future use)
  void ALERT_SEVERITY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Alertes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCount} alertes actives — traitez les documents expirés en priorité.
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
