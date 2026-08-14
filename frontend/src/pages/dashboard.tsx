

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

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<DashboardResponse>(`/api/dashboard?period=${period}`)
      .then((d) => {
        if (cancelled) return;
        // Normalisation défensive : gère 2 formats backend possibles
        // Format A (plat) : { total_vehicles, status_distribution, ... }
        // Format B (emboîté, actuel backend FastAPI) : { kpis: {...}, charts: {...}, recent_alerts, recent_documents }
        const kpis = (d as any)?.kpis ?? {};
        const charts = (d as any)?.charts ?? {};
        const vehiclesByStatus = charts.vehicles_by_status ?? {};
        const documentsByValidity = charts.documents_by_validity ?? {};

        // Conversion du format backend (Record<status, count>) vers le format attendu par les charts
        const statusDistribution = Array.isArray(d?.status_distribution)
          ? d.status_distribution
          : Array.isArray(vehiclesByStatus)
          ? vehiclesByStatus
          : Object.entries(vehiclesByStatus).map(([status, count]) => ({
              status: status as any,
              count: count as number,
            }));

        // Conformité par type : transformer documents_by_validity en données exploitables
        // Backend returns: {"valid": 20, "expired": 3, "expiring_soon": 2, "unknown": 1}
        // Chart expects: [{type: "Valide", rate: 20}, {type: "Expiré", rate: 3}, ...]
        const validityLabels: Record<string, string> = {
          valid: "Valide",
          expiring_soon: "Expire bientôt",
          expired: "Expiré",
          unknown: "Sans date",
        };
        const complianceByType = Array.isArray(d?.compliance_by_type)
          ? d.compliance_by_type
          : Object.entries(documentsByValidity).map(([status, count]) => ({
              type: validityLabels[status] ?? status,
              rate: (count as number) ?? 0,
            }));

        // Normalize recent documents (backend returns document_type.name etc.)
        const rawDocs = Array.isArray(d?.recent_documents) ? d.recent_documents : [];
        const recentDocs = rawDocs.map((doc: any) => ({
          ...doc,
          type: doc.type ?? doc.document_type?.name ?? "—",
          validity: doc.validity ?? doc.validity_status ?? "—",
          vehicle_registration: doc.vehicle_registration ?? "",
        }));

        const normalized: DashboardResponse = {
          total_vehicles: d?.total_vehicles ?? kpis.total_vehicles ?? 0,
          compliance_rate:
            d?.compliance_rate ?? kpis.compliance_rate ?? 0,
          active_alerts: d?.active_alerts ?? kpis.active_alerts ?? 0,
          pending_ocr: (d as any)?.expired_documents ?? (kpis as any)?.expired_documents ?? d?.pending_ocr ?? kpis.pending_ocr ?? 0,
          documents_count:
            d?.documents_count ?? kpis.total_documents ?? 0,
          status_distribution: statusDistribution,
          compliance_by_type: complianceByType,
          alerts_trend: Array.isArray(d?.alerts_trend) ? d.alerts_trend : [],
          uploads_trend: Array.isArray(d?.uploads_trend)
            ? d.uploads_trend
            : Array.isArray(charts.documents_timeline)
            ? charts.documents_timeline.map((item: any) => ({
                month: item.date ?? "",
                count: item.count ?? 0,
              }))
            : [],
          recent_alerts: Array.isArray(d?.recent_alerts) ? d.recent_alerts : [],
          recent_documents: recentDocs as any,
        };
        setData(normalized);
        setLoading(false);
      })
      .catch(async () => {
        if (cancelled) return;
        try {
          const [vehicles, alerts] = await Promise.all([
            apiGet<any[]>("/api/vehicles").catch(() => []),
            apiGet<any[]>("/api/alerts").catch(() => []),
          ]);
          const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
          const safeAlerts = Array.isArray(alerts) ? alerts : [];
          const activeAlerts = safeAlerts.filter((a) => a?.status === "active");
          const statusCounts: Record<string, number> = {};
          safeVehicles.forEach((v) => {
            const s = v?.status;
            if (!s) return;
            statusCounts[s] = (statusCounts[s] || 0) + 1;
          });
          const fallback: DashboardResponse = {
            total_vehicles: safeVehicles.length,
            compliance_rate: Math.round(
              (safeVehicles.filter((v) => v?.status === "active").length /
                Math.max(safeVehicles.length, 1)) *
                100
            ),
            active_alerts: activeAlerts.length,
            pending_ocr: (safeAlerts as any[]).filter(a => a?.severity === "critical" && a?.status === "active").length,
            documents_count: 0,
            status_distribution: Object.entries(statusCounts).map(
              ([status, count]) => ({ status: status as any, count })
            ),
            compliance_by_type: [],
            alerts_trend: [],
            uploads_trend: [],
            recent_alerts: activeAlerts.slice(0, 5) as Alert[],
            recent_documents: [],
          };
          setData(fallback);
        } catch {
          setError("Impossible de charger le tableau de bord.");
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period]);

  if (loading) {
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

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble de la conformité de votre flotte.</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || "Aucune donnée disponible."}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight font-display">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue d'ensemble de la conformité de votre flotte.
          </p>
        </div>
        {/* Period selector */}
        <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
          {(["30j", "90j", "12m"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                period === p
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {p === "12m" ? "12 mois" : p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children" data-tour="kpi-cards">
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
          label="Docs expirés"
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
                        d.validity === "valid"
                          ? "text-green-600"
                          : d.validity === "expired"
                          ? "text-red-600"
                          : d.validity === "expiring_soon" || d.validity === "expiring_30"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`}
                    >
                      {d.validity === "valid" ? "Valide"
                        : d.validity === "expired" ? "Expiré"
                        : d.validity === "expiring_soon" || d.validity === "expiring_30" ? "Expire bientôt"
                        : d.validity ?? "—"}
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
