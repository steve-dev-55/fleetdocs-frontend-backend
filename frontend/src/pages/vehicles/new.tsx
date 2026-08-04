

import * as React from "react";
import { useNavigate } from "react-router-dom";
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
import { apiPost } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Vehicle } from "@/lib/types";

export default function NewVehiclePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload: Partial<Vehicle> = {
      registration: String(data.get("registration") ?? "").trim().toUpperCase(),
      vin: String(data.get("vin") ?? "").trim() || undefined,
      brand: String(data.get("brand") ?? "").trim(),
      model: String(data.get("model") ?? "").trim(),
      type: String(data.get("type") ?? "Fourgon"),
      year: data.get("year")
        ? Number(data.get("year"))
        : new Date().getFullYear(),
      ptac_kg: data.get("ptac") ? Number(data.get("ptac")) : 3500,
      fuel_type: String(data.get("fuel") ?? "Diesel"),
      site: String(data.get("site") ?? "").trim() || undefined,
      driver: String(data.get("driver") ?? "").trim() || undefined,
      status: "available",
    };

    if (!payload.registration || !payload.brand || !payload.model) {
      appToast.error("Champs requis manquants", {
        description: "Immatriculation, marque et modèle sont obligatoires.",
      });
      return;
    }

    setLoading(true);
    try {
      const created = await apiPost<Vehicle>("/api/vehicles", payload);
      appToast.success("Véhicule créé", {
        description: `${created.registration} a été ajouté à votre flotte.`,
      });
      // Navigate to the new vehicle's detail page
      navigate(`/vehicles/${created.id}`);
    } catch (err) {
      appToast.error("Erreur lors de la création", {
        description:
          err instanceof Error ? err.message : "Réessayez dans un instant.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/vehicles">
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Ajouter un véhicule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez les informations du véhicule. Vous pourrez uploader ses documents juste après.
        </p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registration">Immatriculation *</Label>
                <Input
                  id="registration"
                  name="registration"
                  required
                  placeholder="AB-123-CD"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="vin">VIN (châssis)</Label>
                <Input
                  id="vin"
                  name="vin"
                  placeholder="VF1FL000000000001"
                  className="mt-1.5 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="brand">Marque *</Label>
                <Input id="brand" name="brand" required placeholder="Renault" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="model">Modèle *</Label>
                <Input id="model" name="model" required placeholder="Trafic" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue="Fourgon">
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
                <Label htmlFor="year">Année</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min="1980"
                  max="2026"
                  placeholder="2021"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="ptac">PTAC (kg)</Label>
                <Input
                  id="ptac"
                  name="ptac"
                  type="number"
                  placeholder="3500"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="fuel">Carburant</Label>
                <Select name="fuel" defaultValue="Diesel">
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Essence">Essence</SelectItem>
                    <SelectItem value="Électrique">Électrique</SelectItem>
                    <SelectItem value="Hybride">Hybride</SelectItem>
                    <SelectItem value="GNV">GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  name="site"
                  placeholder="Lille - dépôt"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="driver">Conducteur</Label>
                <Input
                  id="driver"
                  name="driver"
                  placeholder="Jean Martin"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
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
                <Link to="/vehicles">Annuler</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {loading ? "Création..." : "Créer le véhicule"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
