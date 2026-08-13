
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import type { Vehicle } from "@/lib/types";

interface VehicleType {
  id: string;
  name: string;
  code: string;
}

export default function EditVehiclePage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const vehicleId = params.id ?? "";
  const [loading, setLoading] = React.useState(false);
  const [vehicle, setVehicle] = React.useState<any>(null);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);

  React.useEffect(() => {
    if (!vehicleId) return;
    void Promise.all([
      apiGet<any>(`/api/vehicles/${vehicleId}`),
      apiGet<VehicleType[] | { items: VehicleType[] }>("/api/vehicle-types"),
    ]).then(([v, vt]) => {
      setVehicle(v);
      const types = Array.isArray(vt) ? vt : vt.items ?? [];
      setVehicleTypes(types);
    }).catch(() => {
      appToast.error("Véhicule introuvable");
      navigate("/vehicles");
    });
  }, [vehicleId, navigate]);

  if (!vehicle) {
    return (
      <div className="text-center py-12 text-muted-foreground">Chargement...</div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Build payload with backend field names
    const payload: Record<string, unknown> = {
      registration: String(data.get("registration") ?? "").trim().toUpperCase(),
      vin: String(data.get("vin") ?? "").trim() || undefined,
      brand: String(data.get("brand") ?? "").trim() || undefined,
      model: String(data.get("model") ?? "").trim() || undefined,
      status: String(data.get("status") ?? "active"),
      mileage: data.get("mileage") ? Number(data.get("mileage")) : undefined,
      color: String(data.get("color") ?? "").trim() || undefined,
      fuel_type: String(data.get("fuel_type") ?? "Diesel"),
    };

    // vehicle_type_id from select
    const typeId = data.get("vehicle_type_id") as string;
    if (typeId && typeId !== "none") {
      payload.vehicle_type_id = typeId;
    }

    setLoading(true);
    try {
      await apiPut(`/api/vehicles/${vehicleId}`, payload);
      appToast.success("Véhicule modifié", {
        description: "Les modifications ont été enregistrées.",
      });
      navigate(`/vehicles/${vehicleId}`);
    } catch (err) {
      appToast.error("Erreur lors de la sauvegarde", {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }

  // Map backend status values to display labels
  const STATUS_OPTIONS = [
    { value: "active", label: "Actif" },
    { value: "maintenance", label: "En maintenance" },
    { value: "out_of_service", label: "Hors service" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to={`/vehicles/${vehicle.id}`}>
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Modifier le véhicule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono">{vehicle.registration}</span> — {vehicle.brand}{" "}
          {vehicle.model}
        </p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registration">Immatriculation</Label>
                <Input
                  id="registration"
                  name="registration"
                  defaultValue={vehicle.registration}
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="vin">VIN (17 caractères)</Label>
                <Input
                  id="vin"
                  name="vin"
                  defaultValue={vehicle.vin ?? ""}
                  className="mt-1.5 font-mono text-sm"
                  maxLength={17}
                />
              </div>
              <div>
                <Label htmlFor="brand">Marque</Label>
                <Input
                  id="brand"
                  name="brand"
                  defaultValue={vehicle.brand ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="model">Modèle</Label>
                <Input
                  id="model"
                  name="model"
                  defaultValue={vehicle.model ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="vehicle_type_id">Type de véhicule</Label>
                <Select name="vehicle_type_id" defaultValue={vehicle.vehicle_type_id ?? "none"}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {vehicleTypes.map((vt) => (
                      <SelectItem key={vt.id} value={vt.id}>
                        {vt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select name="status" defaultValue={vehicle.status ?? "active"}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mileage">Kilométrage</Label>
                <Input
                  id="mileage"
                  name="mileage"
                  type="number"
                  defaultValue={vehicle.mileage ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="color">Couleur</Label>
                <Input
                  id="color"
                  name="color"
                  defaultValue={vehicle.color ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="fuel_type">Carburant</Label>
                <Select name="fuel_type" defaultValue={vehicle.fuel_type ?? "Diesel"}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Essence">Essence</SelectItem>
                    <SelectItem value="Électrique">Électrique</SelectItem>
                    <SelectItem value="Hybride">Hybride</SelectItem>
                    <SelectItem value="GPL">GPL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
