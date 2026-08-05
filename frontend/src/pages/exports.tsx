

import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Truck,
  Bell,
  FileBarChart,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { exportToCsv } from "@/lib/utils";
import type { Vehicle, FleetDocument, Alert } from "@/lib/types";

interface ExportCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count: number;
  onExport: () => void;
  accent: string;
}

function ExportCard({
  icon: Icon,
  title,
  description,
  count,
  onExport,
  accent,
}: ExportCardProps) {
  return (
    <Card className="rounded-xl">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div
            className={`size-11 rounded-lg flex items-center justify-center shrink-0 ${accent}`}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{count}</span>{" "}
              enregistrement(s) exportable(s)
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onExport}
            >
              <Download className="size-4" />
              Exporter en CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExportsPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [documents, setDocuments] = React.useState<FleetDocument[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  React.useEffect(() => {
    const normalize = <T,>(data: T[] | { items?: T[] }): T[] =>
      Array.isArray(data) ? data : (data?.items ?? []);

    void Promise.all([
      apiGet<Vehicle[] | { items?: Vehicle[] }>("/api/vehicles"),
      apiGet<FleetDocument[] | { items?: FleetDocument[] }>("/api/documents"),
      apiGet<Alert[] | { items?: Alert[] }>("/api/alerts?status=all"),
    ])
      .then(([v, d, a]) => {
        setVehicles(normalize(v));
        setDocuments(normalize(d));
        setAlerts(normalize(a));
      })
      .catch((err) => {
        appToast.error("Erreur de chargement", {
          description: err instanceof Error ? err.message : undefined,
        });
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Exports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exportez vos données au format CSV (compatible Excel). Pour PDF, contactez le support.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ExportCard
          icon={Truck}
          title="Véhicules"
          description="Liste complète des véhicules avec statut, conformité et infos techniques."
          count={vehicles.length}
          accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600"
          onExport={() =>
            exportToCsv(
              `vehicules-${new Date().toISOString().split("T")[0]}.csv`,
              vehicles.map((v) => ({
                registration: v.registration,
                brand: v.brand,
                model: v.model,
                type: v.type,
                ptac_kg: v.ptac_kg,
                year: v.year,
                vin: v.vin,
                status: v.status,
                compliance: v.compliance,
                site: v.site ?? "",
                driver: v.driver ?? "",
              }))
            )
          }
        />
        <ExportCard
          icon={FileText}
          title="Documents"
          description="Tous les documents uploadés avec statut OCR, validité et échéances."
          count={documents.length}
          accent="bg-green-50 dark:bg-green-950/40 text-green-600"
          onExport={() =>
            exportToCsv(
              `documents-${new Date().toISOString().split("T")[0]}.csv`,
              documents.map((d) => ({
                file_name: d.file_name,
                type: d.type,
                vehicle_registration: d.vehicle_registration,
                expiry_date: d.expiry_date ?? "",
                ocr_status: d.ocr_status,
                validity: d.validity,
                confidence: d.confidence ?? "",
                size: d.size,
              }))
            )
          }
        />
        <ExportCard
          icon={Bell}
          title="Alertes"
          description="Historique des alertes avec sévérité et dates de déclenchement."
          count={alerts.length}
          accent="bg-amber-50 dark:bg-amber-950/40 text-amber-600"
          onExport={() =>
            exportToCsv(
              `alertes-${new Date().toISOString().split("T")[0]}.csv`,
              alerts.map((a) => ({
                type: a.type,
                severity: a.severity,
                vehicle_registration: a.vehicle_registration ?? "",
                message: a.message,
                triggered_at: a.triggered_at,
                status: a.status,
              }))
            )
          }
        />
      </div>

      <Card className="rounded-xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileBarChart className="size-4 text-muted-foreground" />
            Rapports personnalisés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Besoin d&apos;un rapport PDF personnalisé (audit annuel, contrôle DSF,
            bilan de conformité) ? Le plan Enterprise inclut des rapports
            planifiés automatiquement.
          </p>
          <Button asChild variant="outline" className="mt-3">
            <Link to="/demo">En savoir plus</Link>
          </Button>
          <FileSpreadsheet className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
}
