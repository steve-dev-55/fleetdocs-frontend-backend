

import * as React from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  ShieldCheck,
  Bell,
  Clock,
  ArrowRight,
  Upload,
  Plus,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  StatusDonutChart,
  ComplianceBarChart,
} from "@/components/dashboard/charts";
import { RecentAlerts } from "@/components/dashboard/recent-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiGet } from "@/lib/api-client";
import { OCR_STATUS } from "@/lib/status-config";
import { formatDate } from "@/lib/utils";
import type {
  Alert,
  FleetDocument,
  DashboardData,
} from "@/lib/types";

type Period = "30j" | "90j" | "12m";

interface DashboardResponse extends DashboardData {
  recent_alerts: Alert[];
  recent_documents: FleetDocument[];
}

export default function DashboardPage() {
  const [period, setPeriod] = React.useState<Period>("30j");
  const [data, setData] = React.useState<DashboardResponse | null>(null);

  React.useEffect(() => {
    void apiGet<DashboardResponse>(
      `/api/dashboard?period=${period}`
    ).then(setData);
  }, [period]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue d'ensemble de la conformité de votre flotte.
          </p>
        </div>
        {/* Period selector */}
        <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
          {(["30j", "90j", "12m"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "12m" ? "12 mois" : p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-tour="kpi-cards">
        <KpiCard
          label="Véhicules"
          value={data.total_vehicles}
          icon={Truck}
          accent="blue"
          trend={{ value: 8, direction: "up", positive: true }}
        />
        <KpiCard
          label="Conformité"
          value={data.compliance_rate}
          unit="%"
          icon={ShieldCheck}
          accent="green"
          trend={{ value: 3, direction: "up", positive: true }}
        />
        <KpiCard
          label="Alertes actives"
          value={data.active_alerts}
          icon={Bell}
          accent="amber"
          trend={{ value: 12, direction: "down", positive: true }}
        />
        <KpiCard
          label="OCR en attente"
          value={data.pending_ocr}
          icon={Clock}
          accent="sky"
        />
        <KpiCard
          label="Documents"
          value={data.documents_count}
          icon={Upload}
          accent="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <StatusDonutChart data={data.status_distribution} />
        <ComplianceBarChart data={data.compliance_by_type} />
      </div>

      {/* Recent activity + alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RecentAlerts alerts={data.recent_alerts.slice(0, 6)} />

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Documents récents</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/documents">
                Voir tout
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {data.recent_documents.slice(0, 6).map((d) => (
                <Link
                  key={d.id}
                  to={`/documents/${d.id}`}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="size-9 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold shrink-0">
                    PDF
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {d.type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-mono">{d.vehicle_registration}</span>
                      {" · "}
                      {formatDate(d.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-xs font-medium ${
                        d.ocr_status === "validated"
                          ? "text-green-600"
                          : d.ocr_status === "pending_ocr"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`}
                    >
                      {OCR_STATUS[d.ocr_status].label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="rounded-xl border-dashed">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-foreground">
            Actions rapides
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/vehicles/new">
                <Plus className="size-4" />
                Ajouter un véhicule
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/documents">
                <Upload className="size-4" />
                Uploader un document
              </Link>
            </Button>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline">
                    <Link to="/exports">Exporter mes données</Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>CSV, Excel, PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
