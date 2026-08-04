

import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ALERT_TYPES, ALERT_SEVERITY } from "@/lib/status-config";
import { formatRelative } from "@/lib/utils";
import type { Alert } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Alertes récentes</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/alerts">
            Voir tout
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {alerts.slice(0, 6).map((a) => {
            const sev = ALERT_SEVERITY[a.type];
            return (
              <Link
                key={a.id}
                to="/alerts"
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      label={ALERT_TYPES[a.type]}
                      color={sev.color}
                      withDot
                    />
                    {a.vehicle_registration && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {a.vehicle_registration}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-foreground line-clamp-2">
                    {a.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelative(a.triggered_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
