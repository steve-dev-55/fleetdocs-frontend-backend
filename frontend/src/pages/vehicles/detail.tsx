

import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { ComplianceDot } from "@/components/vehicles/compliance-dot";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { VehicleQrDialog } from "@/components/vehicles/vehicle-qr-dialog";
import { VehiclePhoto } from "@/components/vehicles/vehicle-photo";
import { CustomFieldsCard } from "@/components/vehicles/custom-fields-card";
import { VehicleTimeline } from "@/components/vehicles/vehicle-timeline";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  VEHICLE_STATUS,
  OCR_STATUS,
  DOCUMENT_VALIDITY,
} from "@/lib/status-config";
import { apiGet } from "@/lib/api-client";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { appToast } from "@/lib/toast";
import {
  formatDate,
  formatRelative,
  daysUntil,
  formatFileSize,
  downloadMockPdf,
  normalizeDocuments,
} from "@/lib/utils";
import {
  ArrowLeft,
  Pencil,
  Download,
  FileText,
  Truck,
  Calendar,
  User,
  MapPin,
  Fuel,
  Settings,
  Bell,
  Plus,
  QrCode,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Vehicle, FleetDocument, Alert } from "@/lib/types";

export default function VehicleDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const vehicleId = params.id ?? "";
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [docs, setDocs] = React.useState<FleetDocument[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [qrOpen, setQrOpen] = React.useState(false);

  React.useEffect(() => {
    if (!vehicleId) return;
    void apiGet<Vehicle>(`/api/vehicles/${vehicleId}`).then(setVehicle).catch(() => {});
    // Documents endpoint may return either an array directly or { items: [...] }
    void apiGet<unknown>(
      `/api/documents?vehicle_id=${vehicleId}`
    ).then((data) => {
      setDocs(normalizeDocuments(data) as unknown as FleetDocument[]);
    }).catch(() => {});
    // Alerts endpoint may return either an array directly or { items: [...] }
    void apiGet<Alert[] | { items?: Alert[] }>("/api/alerts")
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setAlerts(items.filter((a) => a.vehicle_id === vehicleId));
      })
      .catch(() => {});
  }, [vehicleId]);

  // Optimistic status change
  const { mutate: changeStatus, isPending: isChanging } = useOptimisticMutation<
    Vehicle | null,
    Vehicle["status"]
  >({
    getCurrent: () => vehicle,
    applyOptimistic: (curr, status) =>
      curr ? { ...curr, status, updated_at: new Date().toISOString() } : curr,
    setState: setVehicle,
    mutate: async (status) => {
      await apiPutWrapper(`/api/vehicles/${vehicleId}`, { status });
    },
    showSuccessToast: true,
    successMessage: "Statut mis à jour",
    errorMessage: "Erreur lors du changement de statut",
  });

  // Calcul des stats de conformité à partir des documents chargés
  const docStats = React.useMemo(() => {
    const valid = docs.filter((d) => d.validity === "valid").length;
    const expiring = docs.filter((d) =>
      ["expiring_30", "expiring_60", "expiring_soon"].includes(d.validity)
    ).length;
    const expired = docs.filter((d) => d.validity === "expired").length;
    const total = docs.length;
    return { valid, expiring, expired, total };
  }, [docs]);

  if (!vehicle) {
    return (
      <div className="text-center py-12 text-muted-foreground">Chargement...</div>
    );
  }

  const infoItems = [
    { icon: Calendar, label: "Mise en circulation", value: formatDate(vehicle.created_at) },
    { icon: User, label: "Conducteur", value: vehicle.driver ?? "—" },
    { icon: MapPin, label: "Site", value: vehicle.site ?? "—" },
    { icon: Fuel, label: "Carburant", value: vehicle.fuel_type ?? "—" },
    { icon: Settings, label: "PTAC", value: `${vehicle.ptac_kg} kg` },
    { icon: Truck, label: "Année", value: String(vehicle.year) },
  ];

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/vehicles/${vehicle.id}`
      : `/vehicles/${vehicle.id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/vehicles">
            <ArrowLeft className="size-4" />
            Véhicules
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Truck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground tracking-tight font-mono">
                  {vehicle.registration}
                </h1>
                <ComplianceDot
                  level={vehicle.compliance ?? "green"}
                  detail={vehicle.compliance_detail}
                />
                <VehicleStatusBadge status={vehicle.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {vehicle.brand} {vehicle.model} · {vehicle.type} · {vehicle.year}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setQrOpen(true)}>
              <QrCode className="size-4" />
              QR Code
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/vehicles/${vehicle.id}/edit`}>
                <Pencil className="size-4" />
                Modifier
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Compliance summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Documents valides</p>
             <p className="mt-1 text-2xl font-bold text-green-600">
               {docStats.valid}
             </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">À surveiller</p>
             <p className="mt-1 text-2xl font-bold text-amber-600">
               {docStats.expiring}
             </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Expirés</p>
             <p className="mt-1 text-2xl font-bold text-red-600">
               {docStats.expired}
             </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total documents</p>
             <p className="mt-1 text-2xl font-bold text-foreground">
               {docStats.total}
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: vehicle info + photo */}
        <Card className="rounded-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Informations véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5">
              <VehiclePhoto
                vehicleId={vehicle.id}
                registration={vehicle.registration}
              />
            </div>
            <dl className="space-y-3">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="size-4" />
                    {item.label}
                  </dt>
                  <dd className="font-medium text-foreground text-right">
                    {item.value}
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="size-4" />
                  VIN
                </dt>
                <dd className="font-mono text-xs text-foreground">
                  {vehicle.vin}
                </dd>
              </div>
            </dl>

            {/* Quick status change */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Changer le statut
              </p>
              <div className="flex flex-wrap gap-1">
                {(
                  ["available", "in_service", "broken_down", "in_garage", "immobilized"] as const
                ).map((s) => (
                  <Button
                    key={s}
                    variant={vehicle.status === s ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isChanging || vehicle.status === s}
                    onClick={() => void changeStatus(s)}
                  >
                    {VEHICLE_STATUS[s].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: documents + alerts */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
              <CardAction>
                <UploadDialog
                  defaultVehicleId={vehicleId}
                  trigger={
                    <Button size="sm">
                      <Plus className="size-4" />
                      Ajouter un document
                    </Button>
                  }
                />
              </CardAction>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="size-8 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucun document. Cliquez sur « Ajouter un document ».
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="pl-6">Document</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>OCR</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.map((d) => {
                        const dleft = daysUntil(d.expiry_date);
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="pl-6">
                              <Link
                                to={`/documents/${d.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {d.type}
                              </Link>
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {d.file_name}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-foreground">
                                {formatDate(d.expiry_date)}
                              </div>
                              {dleft !== null && (
                                <div className="text-xs text-muted-foreground">
                                  {formatRelative(d.expiry_date)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                label={OCR_STATUS[d.ocr_status].label}
                                color={OCR_STATUS[d.ocr_status].color}
                                withDot
                              />
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadMockPdf(d.file_name)}
                                aria-label="Télécharger"
                              >
                                <Download className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {alerts.length > 0 && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Alertes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.map((a) => (
                    <Link
                      key={a.id}
                      to="/alerts"
                      className="flex items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-muted/30 transition-colors"
                    >
                      <Bell className="size-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{a.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatRelative(a.triggered_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* P2-5: Custom fields */}
          <CustomFieldsCard vehicleId={vehicle.id} />
        </div>
      </div>

      {/* P2-7: Unified timeline */}
      <VehicleTimeline vehicleId={vehicle.id} />

      {/* P2-4: QR code dialog */}
      <VehicleQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        registration={vehicle.registration}
        url={qrUrl}
      />
    </div>
  );
}

// Wrapper to avoid direct apiPut import aliasing issue
async function apiPutWrapper(path: string, body: unknown): Promise<unknown> {
  // Use the centralized apiPut which includes JWT auth + API_URL prefix
  const { apiPut } = await import("@/lib/api-client");
  return apiPut(path, body);
}
