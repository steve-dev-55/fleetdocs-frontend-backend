

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
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import type { Vehicle } from "@/lib/types";

export default function EditVehiclePage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const vehicleId = params.id ?? "";
  const [loading, setLoading] = React.useState(false);
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);

  React.useEffect(() => {
    if (!vehicleId) return;
    void apiGet<Vehicle>(`/api/vehicles/${vehicleId}`)
      .then(setVehicle)
      .catch(() => {
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
    const payload: Partial<Vehicle> = {
      registration: String(data.get("registration") ?? "").trim().toUpperCase(),
      vin: String(data.get("vin") ?? "").trim(),
      brand: String(data.get("brand") ?? "").trim(),
      model: String(data.get("model") ?? "").trim(),
      type: String(data.get("type") ?? "Fourgon"),
      status: String(data.get("status") ?? "available") as Vehicle["status"],
      site: String(data.get("site") ?? "").trim() || undefined,
      driver: String(data.get("driver") ?? "").trim() || undefined,
    };

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
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  name="vin"
                  defaultValue={vehicle.vin}
                  className="mt-1.5 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="brand">Marque</Label>
                <Input
                  id="brand"
                  name="brand"
                  defaultValue={vehicle.brand}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="model">Modèle</Label>
                <Input
                  id="model"
                  name="model"
                  defaultValue={vehicle.model}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={vehicle.type}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fourgon">Fourgon</SelectItem>
                    <SelectItem value="Poids lourd">Poids lourd</SelectItem>
                    <SelectItem value="Utilitaire">Utilitaire</SelectItem>
                    <SelectItem value="Voiture">Voiture</SelectItem>
                    <SelectItem value="Remorque">Remorque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select name="status" defaultValue={vehicle.status}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="in_service">En service</SelectItem>
                    <SelectItem value="broken_down">En panne</SelectItem>
                    <SelectItem value="in_garage">Au garage</SelectItem>
                    <SelectItem value="immobilized">Immobilisé</SelectItem>
                    <SelectItem value="out_of_service">Hors service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  name="site"
                  defaultValue={vehicle.site ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="driver">Conducteur</Label>
                <Input
                  id="driver"
                  name="driver"
                  defaultValue={vehicle.driver ?? ""}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Informations complémentaires..."
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" asChild type="button">
                <Link to={`/vehicles/${vehicle.id}`}>Annuler</Link>
              </Button>
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
